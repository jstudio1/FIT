import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { foodLogs, notifications, trainerSettings } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { deleteFoodImage, saveFoodImage } from "@/lib/upload";
import { writeAudit } from "@/lib/audit";
import { hasCurrentPrivacyConsent } from "@/lib/privacy";
import { estimateNutrition } from "@/lib/nutrition-ai";

const MEALS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
type Meal = (typeof MEALS)[number];
const MAX_BYTES = 12 * 1024 * 1024; // 12MB

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }
  if (!(await hasCurrentPrivacyConsent(user.id))) {
    return NextResponse.json({ error: "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนส่งรูปอาหาร" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("image");
  const mealType = String(form.get("mealType") ?? "");
  const note = String(form.get("note") ?? "").trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์รูป" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "ต้องเป็นไฟล์รูปภาพ" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "รูปใหญ่เกิน 12MB" }, { status: 400 });
  }
  if (note && note.length > 2000) {
    return NextResponse.json({ error: "หมายเหตุยาวเกิน 2,000 ตัวอักษร" }, { status: 400 });
  }
  if (!MEALS.includes(mealType as Meal)) {
    return NextResponse.json({ error: "เลือกมื้ออาหาร" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let imagePath: string;
  try {
    imagePath = await saveFoodImage(buffer);
  } catch {
    return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ" }, { status: 500 });
  }

  let foodLogId: number;
  try {
    foodLogId = await db.transaction(async (tx) => {
      const [result] = await tx
        .insert(foodLogs)
        .values({ clientId: user.id, imagePath, mealType: mealType as Meal, note });
      if (user.trainerId) {
        await tx.insert(notifications).values({
          userId: user.trainerId, type: "food", title: "ลูกเทรนส่งรูปอาหาร",
          message: `${user.fullName} ส่งรูปอาหารมื้อใหม่ให้ตรวจ`,
        });
      }
      return result.insertId;
    });
  } catch (error) {
    await deleteFoodImage(imagePath);
    throw error;
  }

  await writeAudit({ actorId: user.id, action: "FOOD_IMAGE_UPLOADED", resourceType: "FOOD_LOG", subjectUserId: user.id });

  // ตรวจอาหารอัตโนมัติด้วย AI ถ้าเทรนเนอร์เปิดโหมด auto ไว้ — อ่านค่า toggle ครั้งเดียว ณ จุดนี้
  // (ถ้าเทรนเนอร์ปิด auto ระหว่างที่คำขอนี้กำลังคำนวณอยู่พอดี งานนี้จะคำนวณจนเสร็จตามปกติ)
  if (user.trainerId) {
    const [setting] = await db
      .select({ autoNutritionEnabled: trainerSettings.autoNutritionEnabled })
      .from(trainerSettings)
      .where(eq(trainerSettings.trainerId, user.trainerId))
      .limit(1);

    if (setting?.autoNutritionEnabled) {
      await db
        .update(foodLogs)
        .set({ autoStatus: "PROCESSING" })
        .where(eq(foodLogs.id, foodLogId));

      const estimate = await estimateNutrition(buffer);

      if (estimate.ok) {
        await db
          .update(foodLogs)
          .set({
            autoStatus: "DONE",
            autoCalories: estimate.calories,
            autoCarbs: estimate.carbs,
            autoProtein: estimate.protein,
            autoFat: estimate.fat,
            autoLabel: estimate.label,
            reviewedAt: new Date(),
            reviewedBy: "AUTO",
          })
          .where(eq(foodLogs.id, foodLogId));
        await db.insert(notifications).values({
          userId: user.id,
          type: "food",
          title: "AI คำนวณแคลอรี่ให้แล้ว",
          message: estimate.calories
            ? `ประมาณการ ~${estimate.calories} แคล จาก ${estimate.label ?? "รูปอาหารของคุณ"}`
            : "AI คำนวณโภชนาการจากรูปอาหารของคุณแล้ว",
        });
      } else {
        await db
          .update(foodLogs)
          .set({ autoStatus: "FAILED" })
          .where(eq(foodLogs.id, foodLogId));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
