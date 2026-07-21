"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, clientProfiles } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { hasCurrentPrivacyConsent } from "@/lib/privacy";

export type ActionState = { error?: string; success?: string } | null;

const createClientSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "ชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร")
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "ใช้ได้เฉพาะ a-z, 0-9, . _ -"),
  password: z.string().min(12, "รหัสผ่านอย่างน้อย 12 ตัวอักษร").max(128),
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อ-นามสกุล").max(128),
});

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const trainer = await requireRole("TRAINER");

  const parsed = createClientSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { username, password, fullName } = parsed.data;

  const dup = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (dup[0]) return { error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" };

  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({ username, passwordHash, role: "CLIENT", fullName, trainerId: trainer.id })
      .$returningId();
    await tx.insert(clientProfiles).values({ userId: inserted[0].id });
  });

  revalidatePath("/trainer/clients");
  revalidatePath("/trainer");
  return { success: `สร้างบัญชีลูกเทรน "${fullName}" สำเร็จ` };
}

/** แปลง form value → number|null */
function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function saveProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const trainer = await requireRole("TRAINER");
  const clientId = Number(formData.get("clientId"));
  if (!Number.isFinite(clientId)) return { error: "ไม่พบลูกเทรน" };

  // ตรวจสอบว่าเป็นลูกเทรนของเทรนเนอร์คนนี้จริง (data isolation)
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, clientId),
        eq(users.role, "CLIENT"),
        eq(users.trainerId, trainer.id),
      ),
    )
    .limit(1);
  if (!rows[0]) return { error: "ไม่มีสิทธิ์แก้ไขลูกเทรนรายนี้" };
  if (!(await hasCurrentPrivacyConsent(clientId))) return { error: "ลูกเทรนยังไม่ได้ยอมรับนโยบายความเป็นส่วนตัว" };

  const data = {
    goals: str(formData.get("goals")),
    healthHistory: str(formData.get("healthHistory")),
    startWeight: num(formData.get("startWeight")),
    startHeight: num(formData.get("startHeight")),
    startWaist: num(formData.get("startWaist")),
    startMuscleMass: num(formData.get("startMuscleMass")),
    startBodyFat: num(formData.get("startBodyFat")),
    exerciseBackground: str(formData.get("exerciseBackground")),
    sleepPattern: str(formData.get("sleepPattern")),
    workPattern: str(formData.get("workPattern")),
    daysPerWeek: num(formData.get("daysPerWeek")),
    mealsPerDay: num(formData.get("mealsPerDay")),
    alcoholFrequency: str(formData.get("alcoholFrequency")),
    disciplineNote: str(formData.get("disciplineNote")),
  };

  // upsert (แถวถูกสร้างตอนสร้างบัญชี แต่กันพลาดด้วยการเช็คก่อน)
  const existing = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, clientId))
    .limit(1);
  if (existing[0]) {
    await db
      .update(clientProfiles)
      .set(data)
      .where(eq(clientProfiles.userId, clientId));
  } else {
    await db.insert(clientProfiles).values({ userId: clientId, ...data });
  }

  revalidatePath(`/trainer/clients/${clientId}`);
  await writeAudit({ actorId: trainer.id, action: "HEALTH_PROFILE_UPDATED", resourceType: "CLIENT_PROFILE", resourceId: clientId, subjectUserId: clientId });
  return { success: "บันทึกประวัติเรียบร้อย" };
}
