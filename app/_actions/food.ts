"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodLogs, foodComments, users, notifications } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";

export type Res = { error?: string; success?: string };

export async function commentFoodAction(
  foodLogId: number,
  comment: string | null,
  calories: number | null,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");

  const cleanComment = comment?.trim() || null;
  const cleanCalories =
    calories != null && Number.isFinite(calories) ? calories : null;
  if (!cleanComment && cleanCalories == null) {
    return { error: "ใส่คอมเมนต์หรือปริมาณแคลอรี่อย่างน้อยอย่างหนึ่ง" };
  }

  // ตรวจสิทธิ์: รูปนี้ต้องเป็นของลูกเทรนของเทรนเนอร์คนนี้
  const [row] = await db
    .select({ clientId: foodLogs.clientId })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .where(and(eq(foodLogs.id, foodLogId), eq(users.trainerId, trainer.id)))
    .limit(1);
  if (!row) return { error: "ไม่มีสิทธิ์ตรวจรายการนี้" };

  await db.insert(foodComments).values({
    foodLogId,
    trainerId: trainer.id,
    comment: cleanComment,
    calories: cleanCalories,
  });

  await db.insert(notifications).values({
    userId: row.clientId,
    type: "food",
    title: "เทรนเนอร์ตรวจอาหารแล้ว",
    message: cleanCalories
      ? `เทรนเนอร์คอมเมนต์อาหารของคุณ (~${cleanCalories} แคล)`
      : "เทรนเนอร์คอมเมนต์อาหารของคุณ",
  });

  revalidatePath("/trainer/food-review");
  revalidatePath("/client/food");
  return { success: "บันทึกคอมเมนต์แล้ว" };
}
