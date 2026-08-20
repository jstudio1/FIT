"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionResults, bookings } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { hasCurrentPrivacyConsent } from "@/lib/privacy";
import { toDateStr } from "@/lib/schedule";
import { onTrainingCompleted } from "@/lib/gamification";
import { getSiteSettings } from "@/lib/settings";

export type Res = { error?: string; success?: string };

export type ResultInput = {
  measuredAt?: string; // yyyy-mm-dd
  weight?: number | null;
  waist?: number | null;
  muscleMass?: number | null;
  bodyFat?: number | null;
  phase: "PRE" | "POST";
  note?: string | null;
};

/* ---------------- CLIENT: บันทึก/ลบ ผลลัพธ์ ---------------- */

export async function addResultAction(input: ResultInput): Promise<Res> {
  const client = await requireRole("CLIENT");
  if (!(await hasCurrentPrivacyConsent(client.id))) return { error: "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนบันทึกข้อมูลสุขภาพ" };

  const metrics = [input.weight, input.waist, input.muscleMass, input.bodyFat];
  if (metrics.every((m) => m == null || Number.isNaN(m))) {
    return { error: "กรอกอย่างน้อย 1 ค่า (น้ำหนัก/รอบเอว/มวลกล้าม/ไขมัน)" };
  }

  let measuredAt = new Date();
  if (input.measuredAt) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.measuredAt))
      return { error: "วันที่ไม่ถูกต้อง" };
    measuredAt = new Date(`${input.measuredAt}T12:00:00`);
    if (Number.isNaN(measuredAt.getTime()))
      return { error: "วันที่ไม่ถูกต้อง" };
  }

  await db.insert(sessionResults).values({
    clientId: client.id,
    weight: input.weight ?? null,
    waist: input.waist ?? null,
    muscleMass: input.muscleMass ?? null,
    bodyFat: input.bodyFat ?? null,
    phase: input.phase,
    note: input.note ?? null,
    measuredAt,
  });
  await writeAudit({ actorId: client.id, action: "HEALTH_RESULT_CREATED", resourceType: "SESSION_RESULT", subjectUserId: client.id });

  revalidatePath("/client/results");
  revalidatePath("/client");
  return { success: "บันทึกผลลัพธ์แล้ว" };
}

export async function deleteResultAction(id: number): Promise<Res> {
  const client = await requireRole("CLIENT");
  await db
    .delete(sessionResults)
    .where(
      and(eq(sessionResults.id, id), eq(sessionResults.clientId, client.id)),
    );
  await writeAudit({ actorId: client.id, action: "HEALTH_RESULT_DELETED", resourceType: "SESSION_RESULT", resourceId: id, subjectUserId: client.id });
  revalidatePath("/client/results");
  revalidatePath("/client");
  return { success: "ลบผลลัพธ์แล้ว" };
}

/* ---------------- TRAINER: เช็คการมาเทรน ---------------- */

export async function markAttendanceAction(
  bookingId: number,
  status: "COMPLETED" | "NO_SHOW",
): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.trainerId, trainer.id)))
    .limit(1);
  if (!b) return { error: "ไม่พบนัด" };

  await db.update(bookings).set({ status }).where(eq(bookings.id, bookingId));
  if (status === "COMPLETED" && b.status !== "COMPLETED") {
    await onTrainingCompleted(b.clientId, b.id);
  }
  revalidatePath(`/trainer/clients/${b.clientId}`);
  revalidatePath("/client");
  return {
    success: status === "COMPLETED" ? "บันทึกว่า: มาเทรน" : "บันทึกว่า: ขาด",
  };
}

/* ---------------- TRAINER: จับเวลาเทรนจริง (เริ่ม/จบ) ---------------- */
/* ความยาวคาบเทรนมาตรฐาน (นาที) อ่านจาก siteSettings.sessionDurationMin — เจ้าของระบบปรับได้ */

export async function startTrainingAction(bookingId: number): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.trainerId, trainer.id)))
    .limit(1);
  if (!b) return { error: "ไม่พบนัด" };
  if (b.status !== "BOOKED") return { error: "นัดนี้บันทึกผลไปแล้ว" };
  if (b.sessionStartedAt) return { error: "เริ่มจับเวลาไปแล้ว" };
  if (b.date !== toDateStr(new Date()))
    return { error: "เริ่มจับเวลาได้เฉพาะนัดของวันนี้ — นัดเก่าให้ใช้ \"บันทึกว่ามาเทรนแล้วโดยไม่จับเวลา\" แทน" };

  await db
    .update(bookings)
    .set({ sessionStartedAt: new Date(), sessionEndedAt: null, durationMinutes: null, durationNote: null })
    .where(eq(bookings.id, bookingId));

  revalidatePath(`/trainer/clients/${b.clientId}`);
  revalidatePath("/trainer");
  return { success: "เริ่มจับเวลาแล้ว" };
}

export async function cancelTrainingStartAction(bookingId: number): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.trainerId, trainer.id)))
    .limit(1);
  if (!b) return { error: "ไม่พบนัด" };
  if (!b.sessionStartedAt || b.sessionEndedAt) return { error: "ไม่มีการจับเวลาที่กำลังทำงานอยู่" };

  await db
    .update(bookings)
    .set({ sessionStartedAt: null })
    .where(eq(bookings.id, bookingId));

  revalidatePath(`/trainer/clients/${b.clientId}`);
  revalidatePath("/trainer");
  return { success: "ยกเลิกการจับเวลาแล้ว" };
}

export async function stopTrainingAction(
  bookingId: number,
  note?: string | null,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.trainerId, trainer.id)))
    .limit(1);
  if (!b) return { error: "ไม่พบนัด" };
  if (!b.sessionStartedAt) return { error: "ยังไม่ได้เริ่มจับเวลา" };
  if (b.sessionEndedAt) return { error: "จบเทรนไปแล้ว" };

  const { sessionDurationMin } = await getSiteSettings();
  const endedAt = new Date();
  const durationMinutes = Math.max(
    0,
    Math.round((endedAt.getTime() - b.sessionStartedAt.getTime()) / 60000),
  );
  const trimmedNote = note?.trim() || null;

  if (durationMinutes !== sessionDurationMin && !trimmedNote) {
    return {
      error:
        durationMinutes > sessionDurationMin
          ? `ใช้เวลาเกิน ${sessionDurationMin} นาทีที่กำหนด กรุณาระบุเหตุผล`
          : `ใช้เวลาน้อยกว่า ${sessionDurationMin} นาทีที่กำหนด กรุณาระบุเหตุผล`,
    };
  }

  await db
    .update(bookings)
    .set({
      sessionEndedAt: endedAt,
      durationMinutes,
      durationNote: trimmedNote,
      status: "COMPLETED",
    })
    .where(eq(bookings.id, bookingId));

  await writeAudit({
    actorId: trainer.id,
    action: "TRAINING_SESSION_COMPLETED",
    resourceType: "BOOKING",
    resourceId: bookingId,
    subjectUserId: b.clientId,
    metadata: { durationMinutes, hasNote: !!trimmedNote },
  });

  await onTrainingCompleted(b.clientId, b.id);

  revalidatePath(`/trainer/clients/${b.clientId}`);
  revalidatePath(`/owner/clients/${b.clientId}`);
  revalidatePath("/trainer");
  revalidatePath("/client");
  return { success: `จบเทรนแล้ว ใช้เวลา ${durationMinutes} นาที` };
}
