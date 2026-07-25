// AI คำนวณโภชนาการอัตโนมัติจากรูปอาหาร: Google Vision (ตรวจชนิดอาหาร) + USDA FDC (ค่าโภชนาการ)
// หมายเหตุ: ตัวเลขที่ได้เป็น "ค่าประมาณ" ต่อ 100 กรัมมาตรฐานของแต่ละรายการที่ตรวจพบ
// ไม่ใช่น้ำหนักจริงบนจาน (รูปเดียวไม่มีข้อมูลสัดส่วน/ความลึก) — ต้องแสดง badge "ประมาณการ" เสมอ

import { createSign } from "crypto";
import { setDefaultResultOrder } from "dns";

// เครื่องที่มีหลาย network interface (โดยเฉพาะ VPN ที่เปิด IPv6 แต่เส้นทางจริงใช้ไม่ได้)
// ทำให้ Node ลองต่อ IPv6 ก่อนตามค่าเริ่มต้นแล้วค้าง/timeout เฉพาะการเชื่อมต่อ "ครั้งแรก" ไปยัง host ใหม่
// บังคับให้ resolve เป็น IPv4 ก่อนเสมอ กันปัญหานี้ที่ต้นตอ
setDefaultResultOrder("ipv4first");

// Cloud Vision API ต้องใช้ OAuth2 access token (ไม่รองรับ ?key= แบบ API key ธรรมดา)
// ขอ token จาก service account ด้วย JWT Bearer flow (RFC 7523) — เซ็นเองด้วย crypto ในตัว Node
// ไม่ต้องพึ่ง google-auth-library เพิ่ม แคช token ไว้ในหน่วยความจำจนกว่าจะใกล้หมดอายุ (token อยู่ได้ 1 ชม.)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(): Promise<string | null> {
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-vision",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64 = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${b64(header)}.${b64(claims)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error("[nutrition-ai] แลก access token ไม่สำเร็จ:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = await res.json();
  if (!data.access_token) return null;

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

const LABEL_BLACKLIST = new Set([
  "food",
  "dish",
  "cuisine",
  "recipe",
  "ingredient",
  "meal",
  "produce",
  "natural foods",
  "comfort food",
  "cooking",
  "tableware",
  "plate",
]);

export type NutritionEstimate = {
  ok: boolean;
  label: string | null;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
};

async function detectFoodLabels(buffer: Buffer): Promise<string[]> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    console.error("[nutrition-ai] ไม่ได้ access token จาก Google (เช็ค GOOGLE_SA_CLIENT_EMAIL/GOOGLE_SA_PRIVATE_KEY)");
    return [];
  }

  const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      requests: [
        {
          image: { content: buffer.toString("base64") },
          features: [{ type: "LABEL_DETECTION", maxResults: 8 }],
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error("[nutrition-ai] Vision API error:", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = await res.json();
  const annotations = data?.responses?.[0]?.labelAnnotations ?? [];
  return annotations
    .filter((a: { score?: number }) => (a.score ?? 0) >= 0.6)
    .map((a: { description: string }) => a.description)
    .filter((label: string) => !LABEL_BLACKLIST.has(label.toLowerCase()))
    .slice(0, 3);
}

async function lookupNutritionPer100g(label: string): Promise<{
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
} | null> {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", label);
  url.searchParams.set("pageSize", "1");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    console.error("[nutrition-ai] USDA FDC error:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = await res.json();
  const food = data?.foods?.[0];
  if (!food) return null;

  const nutrients: Array<{ nutrientName: string; value: number }> =
    food.foodNutrients ?? [];
  const find = (name: string) =>
    nutrients.find((n) => n.nutrientName?.toLowerCase().includes(name))
      ?.value ?? null;

  return {
    calories: find("energy"),
    carbs: find("carbohydrate"),
    protein: find("protein"),
    fat: find("total lipid"),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ลองคำนวณซ้ำอัตโนมัติ (เผื่อปัญหาเครือข่าย/API ชั่วคราว) ก่อนจะถือว่าล้มเหลวจริง */
export async function estimateNutrition(
  buffer: Buffer,
  attempts = 2,
): Promise<NutritionEstimate> {
  let last: NutritionEstimate = {
    ok: false,
    label: null,
    calories: null,
    carbs: null,
    protein: null,
    fat: null,
  };
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(2000);
    last = await estimateNutritionOnce(buffer);
    if (last.ok) return last;
  }
  return last;
}

async function estimateNutritionOnce(
  buffer: Buffer,
): Promise<NutritionEstimate> {
  try {
    const labels = await detectFoodLabels(buffer);
    if (labels.length === 0) {
      return { ok: false, label: null, calories: null, carbs: null, protein: null, fat: null };
    }

    const results = (
      await Promise.all(labels.map((l) => lookupNutritionPer100g(l)))
    ).filter((r): r is NonNullable<typeof r> => r != null);

    if (results.length === 0) {
      return { ok: false, label: labels.join(", "), calories: null, carbs: null, protein: null, fat: null };
    }

    type Totals = { calories: number; carbs: number; protein: number; fat: number };
    const sum = results.reduce<Totals>(
      (acc, r) => ({
        calories: acc.calories + (r.calories ?? 0),
        carbs: acc.carbs + (r.carbs ?? 0),
        protein: acc.protein + (r.protein ?? 0),
        fat: acc.fat + (r.fat ?? 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 },
    );

    return {
      ok: true,
      label: labels.join(", "),
      calories: Math.round(sum.calories),
      carbs: Math.round(sum.carbs),
      protein: Math.round(sum.protein),
      fat: Math.round(sum.fat),
    };
  } catch (err) {
    console.error("[nutrition-ai] estimateNutrition ล้มเหลว:", err);
    return { ok: false, label: null, calories: null, carbs: null, protein: null, fat: null };
  }
}
