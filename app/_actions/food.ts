"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodLogs, foodComments, users, notifications } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

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
    .select({ clientId: foodLogs.clientId })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .where(and(eq(foodLogs.id, foodLogId), eq(users.trainerId, trainer.id)))
    .limit(1);
  if (!row) return { error: "ไม่มีสิทธิ์ตรวจรายการนี้" };

  await db.transaction(async (tx) => {
    await tx.insert(foodComments).values({
      foodLogId, trainerId: trainer.id, comment: cleanComment,
      calories, carbs, protein, fat,
    });
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
