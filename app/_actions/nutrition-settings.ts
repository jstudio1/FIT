"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trainerSettings } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";

export type Res = { error?: string; success?: string };

export async function toggleAutoNutritionAction(enabled: boolean): Promise<Res> {
  const trainer = await requireRole("TRAINER");

  const [s] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainer.id))
    .limit(1);

  if (s) {
    await db
      .update(trainerSettings)
      .set({ autoNutritionEnabled: enabled })
      .where(eq(trainerSettings.trainerId, trainer.id));
  } else {
    await db
      .insert(trainerSettings)
      .values({ trainerId: trainer.id, autoNutritionEnabled: enabled });
  }

  revalidatePath("/trainer/food-review");
  return {
    success: enabled
      ? "เปิดการคำนวณอัตโนมัติด้วย AI แล้ว"
      : "ปิดการคำนวณอัตโนมัติแล้ว — กรอกข้อมูลโภชนาการเองตามปกติ",
  };
}
