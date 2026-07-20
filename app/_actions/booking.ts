"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  blockedSlots,
  trainerSettings,
  notifications,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import {
  isValidSlot,
  isPastSlot,
  canCancelSlot,
  hourLabel,
} from "@/lib/schedule";

export type Res = { error?: string; success?: string };

function isDupError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

/* ---------------- CLIENT ---------------- */

export async function bookSlotAction(
  dateStr: string,
  hour: number,
): Promise<Res> {
  const client = await requireRole("CLIENT");
  if (!client.trainerId)
    return { error: "บัญชีของคุณยังไม่ได้ผูกกับเทรนเนอร์" };
  if (!isValidSlot(dateStr, hour)) return { error: "ช่องเวลาไม่ถูกต้อง" };
  if (isPastSlot(dateStr, hour))
    return { error: "ไม่สามารถจองเวลาที่ผ่านไปแล้ว" };

  const trainerId = client.trainerId;

  const [setting] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainerId))
    .limit(1);
  if (setting && !setting.bookingOpen)
    return { error: "เทรนเนอร์ปิดรับการจองชั่วคราว" };

  const [blk] = await db
    .select({ id: blockedSlots.id })
    .from(blockedSlots)
    .where(
      and(
        eq(blockedSlots.trainerId, trainerId),
        eq(blockedSlots.date, dateStr),
        eq(blockedSlots.hour, hour),
      ),
    )
    .limit(1);
  if (blk) return { error: "ช่วงเวลานี้เทรนเนอร์ไม่ว่าง" };

  try {
    await db.insert(bookings).values({
      clientId: client.id,
      trainerId,
      date: dateStr,
      hour,
      status: "BOOKED",
    });
  } catch (e) {
    if (isDupError(e)) return { error: "ช่องเวลานี้เพิ่งถูกจองไปแล้ว" };
    throw e;
  }

  await db.insert(notifications).values({
    userId: trainerId,
    type: "booking",
    title: "มีการจองใหม่",
    message: `${client.fullName} จองวันที่ ${dateStr} เวลา ${hourLabel(hour)}`,
  });

  revalidatePath("/client/schedule");
  return { success: "จองสำเร็จ" };
}

export async function cancelBookingAction(bookingId: number): Promise<Res> {
  const client = await requireRole("CLIENT");
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.clientId, client.id)))
    .limit(1);
  if (!b) return { error: "ไม่พบการจอง" };
  if (!canCancelSlot(b.date, b.hour))
    return { error: "ยกเลิกได้เฉพาะก่อนเวลาเทรนอย่างน้อย 6 ชั่วโมง" };

  await db.delete(bookings).where(eq(bookings.id, bookingId));
  await db.insert(notifications).values({
    userId: b.trainerId,
    type: "cancel",
    title: "ลูกเทรนยกเลิกนัด",
    message: `${client.fullName} ยกเลิกวันที่ ${b.date} เวลา ${hourLabel(b.hour)}`,
  });

  revalidatePath("/client/schedule");
  return { success: "ยกเลิกการจองแล้ว" };
}

/* ---------------- TRAINER ---------------- */

export async function toggleBookingOpenAction(open: boolean): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  const [s] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainer.id))
    .limit(1);
  if (s) {
    await db
      .update(trainerSettings)
      .set({ bookingOpen: open })
      .where(eq(trainerSettings.trainerId, trainer.id));
  } else {
    await db
      .insert(trainerSettings)
      .values({ trainerId: trainer.id, bookingOpen: open });
  }
  revalidatePath("/trainer/schedule");
  return { success: open ? "เปิดรับการจองแล้ว" : "ปิดรับการจองแล้ว" };
}

export async function blockSlotAction(
  dateStr: string,
  hour: number,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  if (!isValidSlot(dateStr, hour)) return { error: "ช่องเวลาไม่ถูกต้อง" };

  const [b] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.trainerId, trainer.id),
        eq(bookings.date, dateStr),
        eq(bookings.hour, hour),
      ),
    )
    .limit(1);
  if (b) return { error: "ช่องนี้มีลูกเทรนจองอยู่ ยกเลิกการจองก่อน" };

  try {
    await db
      .insert(blockedSlots)
      .values({ trainerId: trainer.id, date: dateStr, hour });
  } catch (e) {
    if (!isDupError(e)) throw e;
  }
  revalidatePath("/trainer/schedule");
  return { success: "ปิดช่วงเวลาแล้ว" };
}

export async function unblockSlotAction(
  dateStr: string,
  hour: number,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  await db
    .delete(blockedSlots)
    .where(
      and(
        eq(blockedSlots.trainerId, trainer.id),
        eq(blockedSlots.date, dateStr),
        eq(blockedSlots.hour, hour),
      ),
    );
  revalidatePath("/trainer/schedule");
  return { success: "เปิดช่วงเวลาแล้ว" };
}

export async function trainerCancelBookingAction(
  bookingId: number,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.trainerId, trainer.id)))
    .limit(1);
  if (!b) return { error: "ไม่พบการจอง" };

  await db.delete(bookings).where(eq(bookings.id, bookingId));
  await db.insert(notifications).values({
    userId: b.clientId,
    type: "cancel",
    title: "เทรนเนอร์ยกเลิกนัด",
    message: `เทรนเนอร์ยกเลิกนัดของคุณ วันที่ ${b.date} เวลา ${hourLabel(b.hour)} (เหตุฉุกเฉิน)`,
  });

  revalidatePath("/trainer/schedule");
  return { success: "ยกเลิกนัดและแจ้งลูกเทรนแล้ว" };
}
