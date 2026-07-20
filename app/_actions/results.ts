"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionResults, bookings } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";

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
  revalidatePath(`/trainer/clients/${b.clientId}`);
  return {
    success: status === "COMPLETED" ? "บันทึกว่า: มาเทรน" : "บันทึกว่า: ขาด",
  };
}
