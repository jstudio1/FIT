"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { calculatorResults, users } from "@/lib/db/schema";
import { requireRole, requireUser } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { homeFor } from "@/lib/session";

export type Res = { error?: string; success?: string };

export type CalculatorResultInput = {
  clientId?: number | null;
  gender: "MALE" | "FEMALE";
  age: number;
  height: number;
  weight: number;
  activity: number;
  goal: "cut" | "maintain" | "bulk";
  bmi: number;
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
};

export async function saveCalculatorResultAction(
  input: CalculatorResultInput,
): Promise<Res> {
  const user = await requireUser();

  if (
    !Number.isFinite(input.age) ||
    !Number.isFinite(input.height) ||
    !Number.isFinite(input.weight) ||
    !Number.isFinite(input.calories)
  ) {
    return { error: "ข้อมูลคำนวณไม่ถูกต้อง" };
  }

  // ลูกเทรนบันทึกได้เฉพาะของตัวเอง / เทรนเนอร์เลือกลูกเทรนของตัวเองเท่านั้น (หรือไม่เลือกก็ได้)
  let clientId: number | null = null;
  if (user.role === "CLIENT") {
    clientId = user.id;
  } else if (input.clientId) {
    const [client] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, input.clientId),
          eq(users.role, "CLIENT"),
          user.role === "TRAINER" ? eq(users.trainerId, user.id) : undefined,
        ),
      )
      .limit(1);
    if (!client) return { error: "ไม่พบลูกเทรนที่เลือก" };
    clientId = client.id;
  }

  await db.insert(calculatorResults).values({
    createdBy: user.id,
    clientId,
    gender: input.gender,
    age: input.age,
    height: input.height,
    weight: input.weight,
    activity: input.activity,
    goal: input.goal,
    bmi: input.bmi,
    bmr: input.bmr,
    tdee: input.tdee,
    calories: input.calories,
    protein: input.protein,
    carb: input.carb,
    fat: input.fat,
  });

  await writeAudit({
    actorId: user.id,
    action: "CALCULATOR_RESULT_SAVED",
    resourceType: "CALCULATOR_RESULT",
    subjectUserId: clientId ?? user.id,
  });

  revalidatePath(homeFor(user.role) + "/calculator");
  return { success: "บันทึกผลคำนวณแล้ว" };
}

export async function deleteCalculatorResultAction(id: number): Promise<Res> {
  const user = await requireRole("OWNER", "TRAINER", "CLIENT");

  await db
    .delete(calculatorResults)
    .where(
      and(eq(calculatorResults.id, id), eq(calculatorResults.createdBy, user.id)),
    );

  await writeAudit({
    actorId: user.id,
    action: "CALCULATOR_RESULT_DELETED",
    resourceType: "CALCULATOR_RESULT",
    resourceId: String(id),
  });

  revalidatePath(homeFor(user.role) + "/calculator");
  return { success: "ลบผลคำนวณแล้ว" };
}
