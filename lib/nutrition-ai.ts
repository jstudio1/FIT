// AI คำนวณโภชนาการอัตโนมัติจากรูปอาหาร: Google Vision (ตรวจชนิดอาหาร) + USDA FDC (ค่าโภชนาการต่อ 100 กรัม)
// หมายเหตุ: รูปเดียวไม่มีข้อมูลน้ำหนัก/สัดส่วนจริงบนจาน จึงประมาณน้ำหนักส่วนประกอบแต่ละอย่างด้วยค่ากลาง
// (ส่วนหลัก ~150 กรัม, ส่วนรอง ~60 กรัม, ปรับลดตามมื้อ เช่น ของว่างคูณ 0.55) ก่อนคำนวณ — ยังคงเป็น
// "ค่าประมาณ" เท่านั้น ไม่ใช่การชั่งน้ำหนักจริง ต้องแสดง badge "ประมาณการ" เสมอ

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
  // ป้ายที่ไม่ได้บอกชนิดอาหารจริง (มักโผล่มากับรูปห่อ/บรรจุภัณฑ์ที่มีตัวหนังสือ) — ถ้าปล่อยผ่านจะถูกเอาไป
  // ค้นใน USDA เป็น "อาหาร" ปลอมๆ ทำให้แคลอรี่พุ่งเกินจริง
  "packaging and labeling",
  "packaging",
  "label",
  "font",
  "brand",
  "text",
  "logo",
  "advertising",
  "packing materials",
  // ป้ายที่บอก "วิธีทำ" ไม่ใช่ "ชนิดอาหาร" — ถ้าปล่อยให้แย่งที่ label อื่นจะไปนับซ้ำกับของที่มีอยู่แล้ว
  // (เช่น "Shrimp" + "Fried food" คือของชิ้นเดียวกัน ไม่ใช่ 2 อย่าง) จัดการแยกผ่าน FRIED_KEYWORDS แทน
  "fried food",
  "deep frying",
  "panko",
  "battered",
]);

// คำที่บ่งบอกแหล่งโปรตีน/ไขมันหลักของจาน — ให้ความสำคัญก่อนคำทั่วไป (ผัก/ข้าว/เครื่องเคียง) เสมอ
// เพราะเป็นตัวกำหนดค่าโภชนาการของทั้งจานมากที่สุด แม้ Vision จะให้คะแนนความมั่นใจต่ำกว่าก็ตาม
const PROTEIN_KEYWORDS = [
  "chicken",
  "beef",
  "pork",
  "meat",
  "fish",
  "seafood",
  "shrimp",
  "prawn",
  "egg",
  "yolk",
  "tofu",
  "duck",
  "turkey",
  "salmon",
  "tuna",
  "squid",
  "crab",
  "sausage",
  "bacon",
];

export type NutritionEstimate = {
  ok: boolean;
  label: string | null;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
};

// คำไทยที่ลูกเทรนมักพิมพ์ในช่องหมายเหตุ → คำอังกฤษไว้ค้น USDA (USDA เป็นฐานข้อมูลภาษาอังกฤษ ค้นคำไทย
// ตรงๆ จะไม่เจออะไรเลย) ถ้าลูกเทรนบอกเองว่ากินอะไรอยู่ ควรเชื่อคำอธิบายนี้มากกว่าที่ AI เดาจากรูปเสมอ
// เพราะแม่นยำกว่ามาก โดยเฉพาะจานที่หน้าตาไม่ชัดเจนหรือ Vision แยกส่วนประกอบยาก
const NOTE_FOOD_KEYWORDS: Record<string, string> = {
  "ไก่": "chicken",
  "หมู": "pork",
  "เนื้อวัว": "beef",
  "เนื้อ": "beef",
  "ปลา": "fish",
  "กุ้ง": "shrimp",
  "ปู": "crab",
  "หมึก": "squid",
  "ไข่": "egg",
  "เต้าหู้": "tofu",
  "เป็ด": "duck",
  "ข้าว": "rice",
  "ผัก": "vegetable",
  "ฟักทอง": "pumpkin",
  "มันฝรั่ง": "potato",
  "ขนมปัง": "bread",
  "นม": "milk",
  "ช็อกโกแลต": "chocolate",
  "บะหมี่": "noodle",
  "ก๋วยเตี๋ยว": "noodle",
  "ผลไม้": "fruit",
  "กล้วย": "banana",
  "แอปเปิ้ล": "apple",
  "ส้ม": "orange",
};

/** ดึงคำที่ลูกเทรนพิมพ์ในหมายเหตุ แปลงเป็นคำอังกฤษสำหรับค้น USDA (เชื่อถือได้มากกว่าการเดาจากรูป) */
function labelsFromNote(note?: string | null): string[] {
  if (!note) return [];
  const found: string[] = [];
  for (const [thai, eng] of Object.entries(NOTE_FOOD_KEYWORDS)) {
    if (note.includes(thai) && !found.includes(eng)) {
      found.push(eng.charAt(0).toUpperCase() + eng.slice(1));
    }
  }
  return found.slice(0, 3);
}

type LabelResult = { labels: string[]; fried: boolean };

async function detectFoodLabels(buffer: Buffer, note?: string | null): Promise<LabelResult> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    console.error("[nutrition-ai] ไม่ได้ access token จาก Google (เช็ค GOOGLE_SA_CLIENT_EMAIL/GOOGLE_SA_PRIVATE_KEY)");
    return { labels: [], fried: false };
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
          // ขอเยอะหน่อย (Vision มักให้คะแนนคำทั่วไปอย่าง "Vegetable"/"Rice" สูงกว่าคำเจาะจงแหล่งโปรตีน
          // อย่าง "Chicken"/"Meat" มาก ถ้าขอน้อยไปคำที่สำคัญต่อโภชนาการอาจหลุด top-N ไปเลย)
          features: [{ type: "LABEL_DETECTION", maxResults: 15 }],
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error("[nutrition-ai] Vision API error:", res.status, await res.text().catch(() => ""));
    return { labels: [], fried: false };
  }

  const data = await res.json();
  const annotations = data?.responses?.[0]?.labelAnnotations ?? [];
  const confidentRaw: string[] = annotations
    .filter((a: { score?: number }) => (a.score ?? 0) >= 0.6)
    .map((a: { description: string }) => a.description);

  // ตรวจจับ "วิธีทอด" แยกจากรายชื่อวัตถุดิบ — ไม่ให้ไปแย่งที่ label อื่นหรือถูกนับเป็นวัตถุดิบซ้ำซ้อน
  // (เอาไว้แค่ boost ไขมันของโปรตีน/แป้งหลักทีหลัง) เช็คทั้งจาก Vision และคำว่า "ทอด" ในหมายเหตุ
  const fried =
    confidentRaw.some((l) => FRIED_KEYWORDS.some((kw) => l.toLowerCase().includes(kw))) ||
    !!note?.includes("ทอด");

  const candidates = confidentRaw.filter(
    (label: string) => !LABEL_BLACKLIST.has(label.toLowerCase()),
  );

  // แหล่งโปรตีน/ไขมันหลักของจาน (เนื้อสัตว์ ไข่ ฯลฯ) กำหนดค่าโภชนาการของทั้งจานมากกว่าข้าว/ผัก/เครื่องเคียง
  // มาก แต่ Vision มักให้คะแนนความมั่นใจของคำทั่วไปพวกนั้นสูงกว่า — ถ้าเรียงตามคะแนนดิบเฉยๆ ส่วนที่สำคัญ
  // ที่สุดจะหลุดไปได้ง่าย ต้องดันคำที่เข้าเงื่อนไขนี้ขึ้นมาก่อนเสมอ — เอาแค่ตัวเดียว (มั่นใจสุด) เพราะ
  // "Meat"/"Chicken" มักหมายถึงเนื้อชิ้นเดียวกัน ถ้าเอาทั้งคู่จะไปแย่งที่ "Rice"/"Vegetable" ออกจากลิสต์
  // ทั้งที่เป็นส่วนประกอบคาร์บที่สำคัญไม่แพ้กัน
  const isProteinCandidate = (l: string) =>
    PROTEIN_KEYWORDS.some((kw) => l.toLowerCase().includes(kw));
  const protein = candidates.filter(isProteinCandidate).slice(0, 1);
  // ตัดคำที่เข้าเงื่อนไข "แหล่งโปรตีน" ออกจาก rest ทั้งหมด (ไม่ใช่แค่ตัวที่เลือกไปแล้ว) กัน label ที่
  // หมายถึงของชิ้นเดียวกันแต่คนละคำ (เช่น "Egg"/"Yolk"/"Fried egg") หลุดเข้ามาเป็นอีกช่องนึงซ้ำซ้อน
  const rest = candidates.filter((l: string) => !isProteinCandidate(l));
  const visionLabels = [...protein, ...rest];

  // ถ้าลูกเทรนพิมพ์บอกในหมายเหตุ ให้คำเหล่านั้นมาก่อนเสมอ (เชื่อถือได้กว่าที่ AI เดาจากรูป) แล้วเติมช่อง
  // ที่เหลือด้วยคำที่ Vision ตรวจพบ — ข้ามคำจาก Vision ที่ซ้ำแนวคิดกับที่หมายเหตุระบุไปแล้ว (เช่น หมายเหตุ
  // บอก "chicken" ก็ไม่ต้องเอา Vision label ที่เป็นแหล่งโปรตีนอื่นมาซ้ำอีก)
  const noteLabels = labelsFromNote(note);
  if (noteLabels.length === 0) return { labels: visionLabels.slice(0, 3), fried };

  const noteHasProtein = noteLabels.some((l) =>
    PROTEIN_KEYWORDS.some((kw) => l.toLowerCase().includes(kw)),
  );
  const supplementary = visionLabels.filter((l) => {
    const isProteinLabel = PROTEIN_KEYWORDS.some((kw) => l.toLowerCase().includes(kw));
    if (noteHasProtein && isProteinLabel) return false; // หมายเหตุระบุโปรตีนไว้แล้ว ไม่ต้องซ้ำ
    return !noteLabels.some((nl) => l.toLowerCase().includes(nl.toLowerCase()));
  });
  return { labels: [...noteLabels, ...supplementary].slice(0, 3), fried };
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

// ค่าโภชนาการจาก USDA เป็น "ต่อ 100 กรัม" เสมอ — ห้ามเอามาบวกกันตรงๆ ไม่งั้นเท่ากับสมมติว่าจานนั้นมี
// ส่วนประกอบแต่ละอย่างหนักชิ้นละ 100 กรัมเต็ม (เช่น ไก่ 100 กรัม + ฟักทอง 100 กรัม = โปรตีน/แคลสูงเกินจริง
// มาก โดยเฉพาะของว่างหรือจานเล็กๆ) ต้องประมาณน้ำหนักส่วนประกอบแต่ละอย่างตามความเป็นจริงก่อนคูณสัดส่วน
//
// น้ำหนักกำหนดตาม "ประเภทอาหาร" ไม่ใช่ตามลำดับที่ตรวจพบ — เพราะอาหารไทยส่วนใหญ่กินคู่ข้าว/แป้งเป็นหลัก
// (ข้าวมักเป็นส่วนที่หนักที่สุดในจาน) ถ้าให้น้ำหนักตามลำดับ (โปรตีนมาก่อนเสมอ) จะทำให้ข้าว/แป้งซึ่งเป็น
// แหล่งคาร์บหลักถูกตีค่าเป็นแค่ "เครื่องเคียง" ผิดพลาดได้ (พบจากเคสข้าวแกงกะหรี่กุ้งทอด — คาร์บ/ไขมันต่ำ
// เกินจริงเพราะข้าวได้น้ำหนักแค่เท่าเครื่องเคียง)
const STAPLE_KEYWORDS = ["rice", "noodle", "bread", "potato", "pasta", "toast", "porridge", "congee"];
const STAPLE_GRAMS = 170; // ข้าว/แป้ง/เส้น มักเป็นส่วนที่หนักที่สุดในจานอาหารไทย
const PROTEIN_GRAMS = 120; // เนื้อสัตว์/ไข่/อาหารทะเล
// วิธีทอด/ชุบแป้งทอดเพิ่มไขมันจากน้ำมัน/แป้งชุบทอดอย่างมีนัยสำคัญ — ให้น้ำหนักเทียบเท่าโปรตีน ไม่ใช่แค่
// เครื่องเคียงเบาๆ ไม่งั้นไขมันจะต่ำเกินจริงสำหรับอาหารทอด (เช่น กุ้งทอด/หมูทอด)
const FRIED_KEYWORDS = ["fried", "deep frying", "tempura", "panko", "battered", "crispy"];
const OTHER_GRAMS = 50; // ผัก/เครื่องเคียง/อื่นๆ ที่ไม่เข้าเงื่อนไขข้างต้น
const MEAL_PORTION_MULTIPLIER: Record<string, number> = {
  SNACK: 0.55, // ของว่างมักเป็นจานเล็กกว่ามื้อหลักมาก
  BREAKFAST: 0.85,
  LUNCH: 1,
  DINNER: 1,
};

// ของว่าง/ขนมสำเร็จรูปมักเป็นชิ้นเล็ก (ซองขนม/แท่งช็อกโกแลต จริงหนักแค่ ~30-50 กรัม) ไม่ใช่จานอาหาร
// ถ้า label เข้าเงื่อนไขนี้ ให้ใช้น้ำหนักเล็กแทนน้ำหนักตามประเภทปกติเสมอ (ไม่คูณ MEAL_PORTION_MULTIPLIER
// ซ้ำอีก เพราะขนาดซองคงที่ไม่ได้ขึ้นกับว่าเป็นมื้อไหน)
const SMALL_SNACK_GRAMS = 40;
const SMALL_SNACK_KEYWORDS = [
  "chocolate",
  "candy",
  "cookie",
  "cracker",
  "chip",
  "snack",
  "confectionery",
  "biscuit",
  "wafer",
  "gummi",
  "gummy",
  "dessert",
];

/** ลองคำนวณซ้ำอัตโนมัติ (เผื่อปัญหาเครือข่าย/API ชั่วคราว) ก่อนจะถือว่าล้มเหลวจริง */
export async function estimateNutrition(
  buffer: Buffer,
  mealType?: string,
  note?: string | null,
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
    last = await estimateNutritionOnce(buffer, mealType, note);
    if (last.ok) return last;
  }
  return last;
}

async function estimateNutritionOnce(
  buffer: Buffer,
  mealType?: string,
  note?: string | null,
): Promise<NutritionEstimate> {
  try {
    const { labels, fried } = await detectFoodLabels(buffer, note);
    if (labels.length === 0) {
      return { ok: false, label: null, calories: null, carbs: null, protein: null, fat: null };
    }

    const per100g = await Promise.all(labels.map((l) => lookupNutritionPer100g(l)));
    const portionMultiplier = MEAL_PORTION_MULTIPLIER[mealType ?? ""] ?? 1;

    type Totals = { calories: number; carbs: number; protein: number; fat: number };
    let sum: Totals = { calories: 0, carbs: 0, protein: 0, fat: 0 };
    let matched = 0;

    labels.forEach((label, i) => {
      const r = per100g[i];
      if (!r) return;
      matched++;
      // ประมาณน้ำหนักจริงของส่วนประกอบนี้ (กรัม) ตามประเภทอาหาร แทนที่จะเอาค่าต่อ 100 กรัมมาบวกตรงๆ
      // หรือกะตามลำดับที่ตรวจพบ (ข้าว/แป้งควรหนักสุดในจานอาหารไทยเสมอ ไม่ใช่แค่เพราะตรวจพบเป็นอันดับหลัง)
      const lower = label.toLowerCase();
      const isSmallSnack = SMALL_SNACK_KEYWORDS.some((kw) => lower.includes(kw));
      const isStaple = STAPLE_KEYWORDS.some((kw) => lower.includes(kw));
      const isProteinLabel = PROTEIN_KEYWORDS.some((kw) => lower.includes(kw));
      const baseGrams = isStaple ? STAPLE_GRAMS : isProteinLabel ? PROTEIN_GRAMS : OTHER_GRAMS;
      const grams = isSmallSnack ? SMALL_SNACK_GRAMS : baseGrams * portionMultiplier;
      const factor = grams / 100;
      sum = {
        calories: sum.calories + (r.calories ?? 0) * factor,
        carbs: sum.carbs + (r.carbs ?? 0) * factor,
        protein: sum.protein + (r.protein ?? 0) * factor,
        fat: sum.fat + (r.fat ?? 0) * factor,
      };
    });

    if (matched === 0) {
      return { ok: false, label: labels.join(", "), calories: null, carbs: null, protein: null, fat: null };
    }

    // ของทอด/ชุบแป้งทอดมีน้ำมัน+แป้งชุบเพิ่มเข้ามาซึ่งไม่มีอยู่ในค่าโภชนาการของวัตถุดิบดิบ (เช่น "Shrimp"
    // เพียวๆ ไขมันต่ำมาก แต่กุ้งทอดชุบแป้งไม่ใช่) เป็น modifier แยกจากรายการวัตถุดิบ ไม่ใช่ label แยกต่างหาก
    // กันไม่ให้ไปแย่งที่/นับซ้ำกับวัตถุดิบตัวเดียวกัน
    if (fried) {
      const extraFat = sum.fat * 0.6 + 8; // เพิ่มทั้งแบบสัดส่วนและค่าคงที่ (น้ำมันที่ซึมเข้าแป้งชุบ)
      sum = { ...sum, fat: sum.fat + extraFat, calories: sum.calories + extraFat * 9 };
    }

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
