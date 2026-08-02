"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodLogs, foodComments, users, notifications } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { readFoodImage } from "@/lib/upload";
import { estimateNutrition } from "@/lib/nutrition-ai";

export type Res = { error?: string; success?: string };

export type FoodCommentInput = {
  comment: string | null;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
};

function cleanNum(n: number | null): number | null {
  return n != null && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export async function commentFoodAction(
  foodLogId: number,
  input: FoodCommentInput,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");

  const cleanComment = input.comment?.trim() || null;
  const calories = cleanNum(input.calories);
  const carbs = cleanNum(input.carbs);
  const protein = cleanNum(input.protein);
  const fat = cleanNum(input.fat);

  if (!cleanComment && calories == null && carbs == null && protein == null && fat == null) {
    return { error: "ใส่คอมเมนต์หรือข้อมูลโภชนาการอย่างน้อยหนึ่งอย่าง" };
  }

  // ตรวจสิทธิ์: รูปนี้ต้องเป็นของลูกเทรนของเทรนเนอร์คนนี้
  const [row] = await db
    .select({ clientId: foodLogs.clientId, reviewedAt: foodLogs.reviewedAt })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .where(and(eq(foodLogs.id, foodLogId), eq(users.trainerId, trainer.id)))
    .limit(1);
  if (!row) return { error: "ไม่มีสิทธิ์ตรวจรายการนี้" };
  if (row.reviewedAt) return { error: "รายการนี้ตรวจแล้ว ไม่สามารถส่งซ้ำได้" };

  await db.transaction(async (tx) => {
    await tx.insert(foodComments).values({
      foodLogId, trainerId: trainer.id, comment: cleanComment,
      calories, carbs, protein, fat,
    });
    await tx
      .update(foodLogs)
      .set({ reviewedAt: new Date(), reviewedBy: "TRAINER" })
      .where(eq(foodLogs.id, foodLogId));
    await tx.insert(notifications).values({
      userId: row.clientId,
      type: "food",
      title: "เทรนเนอร์ตรวจอาหารแล้ว",
      message: calories
        ? `เทรนเนอร์คอมเมนต์อาหารของคุณ (~${calories} แคล)`
        : "เทรนเนอร์คอมเมนต์อาหารของคุณ",
    });
  });

  await writeAudit({ actorId: trainer.id, action: "FOOD_LOG_REVIEWED", resourceType: "FOOD_LOG", resourceId: foodLogId, subjectUserId: row.clientId });

  revalidatePath("/trainer/food-review");
  revalidatePath("/trainer/clients");
  revalidatePath("/client/food");
  return { success: "บันทึกข้อมูลโภชนาการแล้ว" };
}

export async function retryAutoNutritionAction(foodLogId: number): Promise<Res> {
  const trainer = await requireRole("TRAINER");

  const [row] = await db
    .select({
      clientId: foodLogs.clientId,
      imagePath: foodLogs.imagePath,
      mealType: foodLogs.mealType,
      note: foodLogs.note,
      reviewedAt: foodLogs.reviewedAt,
    })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .where(and(eq(foodLogs.id, foodLogId), eq(users.trainerId, trainer.id)))
    .limit(1);
  if (!row) return { error: "ไม่มีสิทธิ์ตรวจรายการนี้" };
  if (row.reviewedAt) return { error: "รายการนี้ตรวจแล้ว" };

  const buffer = await readFoodImage(row.imagePath);
  if (!buffer) return { error: "ไม่พบไฟล์รูป" };

  await db.update(foodLogs).set({ autoStatus: "PROCESSING" }).where(eq(foodLogs.id, foodLogId));

  const estimate = await estimateNutrition(buffer, row.mealType, row.note);

  if (!estimate.ok) {
    await db.update(foodLogs).set({ autoStatus: "FAILED" }).where(eq(foodLogs.id, foodLogId));
    return { error: "AI คำนวณไม่สำเร็จอีกครั้ง ลองใหม่ภายหลัง หรือกรอกข้อมูลเอง" };
  }

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
    userId: row.clientId,
    type: "food",
    title: "AI คำนวณแคลอรี่ให้แล้ว",
    message: estimate.calories
      ? `ประมาณการ ~${estimate.calories} แคล จาก ${estimate.label ?? "รูปอาหารของคุณ"}`
      : "AI คำนวณโภชนาการจากรูปอาหารของคุณแล้ว",
  });

  revalidatePath("/trainer/food-review");
  revalidatePath("/trainer/clients");
  revalidatePath("/client/food");
  return { success: "คำนวณสำเร็จแล้ว" };
}
