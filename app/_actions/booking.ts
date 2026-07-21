"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  blockedSlots,
  recurringBreaks,
  trainerSettings,
  notifications,
  bookingCancellations,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import {
  isValidSlot,
  isPastSlot,
  canCancelSlot,
  hourLabel,
  getHoursRange,
  toDateStr,
  OPEN_HOUR,
  CLOSE_HOUR,
} from "@/lib/schedule";

export type Res = { error?: string; success?: string };

function isDupError(e: unknown): boolean {
  // drizzle ห่อ error ของ mysql2 ไว้ใน .cause (message ชั้นนอกจะเป็น "Failed query: ...")
  // เลยต้องเช็คทั้งชั้นนอกและ .cause
  let cur: unknown = e;
  for (let i = 0; i < 3 && cur; i++) {
    if (
      typeof cur === "object" &&
      "code" in cur &&
      (cur as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      return true;
    }
    cur = (cur as { cause?: unknown } | null)?.cause;
  }
  return false;
}

/* ---------------- CLIENT ---------------- */

export async function bookSlotAction(
  dateStr: string,
  hour: number,
): Promise<Res> {
  const client = await requireRole("CLIENT");
  if (!client.trainerId)
    return { error: "บัญชีของคุณยังไม่ได้ผูกกับเทรนเนอร์" };

  const trainerId = client.trainerId;

  const [setting] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainerId))
    .limit(1);
  const openHour = setting?.openHour ?? OPEN_HOUR;
  const closeHour = setting?.closeHour ?? CLOSE_HOUR;

  if (!isValidSlot(dateStr, hour, openHour, closeHour))
    return { error: "ช่องเวลาไม่ถูกต้อง" };
  if (isPastSlot(dateStr, hour))
    return { error: "ไม่สามารถจองเวลาที่ผ่านไปแล้ว" };
  if (setting && !setting.bookingOpen)
    return { error: "เทรนเนอร์ปิดรับการจองชั่วคราว" };

  const [recur] = await db
    .select({ id: recurringBreaks.id })
    .from(recurringBreaks)
    .where(
      and(eq(recurringBreaks.trainerId, trainerId), eq(recurringBreaks.hour, hour)),
    )
    .limit(1);
  if (recur) return { error: "ช่วงเวลานี้เทรนเนอร์ไม่รับเทรนเป็นประจำทุกวัน" };

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

  await db.insert(bookingCancellations).values({
    trainerId: b.trainerId,
    clientId: b.clientId,
    date: b.date,
    hour: b.hour,
    cancelledBy: "CLIENT",
  });
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

  const [setting] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainer.id))
    .limit(1);
  const openHour = setting?.openHour ?? OPEN_HOUR;
  const closeHour = setting?.closeHour ?? CLOSE_HOUR;
  if (!isValidSlot(dateStr, hour, openHour, closeHour))
    return { error: "ช่องเวลาไม่ถูกต้อง" };

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

  await db.insert(bookingCancellations).values({
    trainerId: b.trainerId,
    clientId: b.clientId,
    date: b.date,
    hour: b.hour,
    cancelledBy: "TRAINER",
  });
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

/* ---------------- ตั้งค่าเวลาทำการ ---------------- */

export async function updateWorkingHoursAction(
  openHour: number,
  closeHour: number,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");

  if (
    !Number.isInteger(openHour) ||
    !Number.isInteger(closeHour) ||
    openHour < 0 ||
    openHour > 23 ||
    closeHour < 1 ||
    closeHour > 24 ||
    closeHour <= openHour
  ) {
    return { error: "ช่วงเวลาทำการไม่ถูกต้อง" };
  }

  // กันไม่ให้ย่อเวลาทำการจนซ่อนนัดที่จองไว้แล้วในอนาคต
  const today = toDateStr(new Date());
  const futureBookings = await db
    .select({ hour: bookings.hour })
    .from(bookings)
    .where(and(eq(bookings.trainerId, trainer.id), gte(bookings.date, today)));
  const outOfRange = futureBookings.filter(
    (b) => b.hour < openHour || b.hour >= closeHour,
  ).length;
  if (outOfRange > 0) {
    return {
      error: `มีนัดในอนาคต ${outOfRange} รายการอยู่นอกช่วงเวลาที่จะตั้งใหม่ กรุณายกเลิกนัดเหล่านั้นก่อน`,
    };
  }

  const [s] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainer.id))
    .limit(1);
  if (s) {
    await db
      .update(trainerSettings)
      .set({ openHour, closeHour })
      .where(eq(trainerSettings.trainerId, trainer.id));
  } else {
    await db
      .insert(trainerSettings)
      .values({ trainerId: trainer.id, openHour, closeHour });
  }

  revalidatePath("/trainer/schedule");
  revalidatePath("/client/schedule");
  return {
    success: `ตั้งเวลาทำการเป็น ${hourLabel(openHour)}–${hourLabel(closeHour)} แล้ว`,
  };
}

/* ---------------- ปิด/เปิดรับการจองทั้งช่วงวันที่ ---------------- */

function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function blockDateRangeAction(
  fromDate: string,
  toDate: string,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  if (!isValidDateStr(fromDate) || !isValidDateStr(toDate))
    return { error: "รูปแบบวันที่ไม่ถูกต้อง" };

  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  if (start.getTime() > end.getTime())
    return { error: "วันที่เริ่มต้องมาก่อนวันที่สิ้นสุด" };

  const totalDays =
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (totalDays > 366) return { error: "เลือกช่วงได้ไม่เกิน 1 ปี" };

  const [setting] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainer.id))
    .limit(1);
  const openHour = setting?.openHour ?? OPEN_HOUR;
  const closeHour = setting?.closeHour ?? CLOSE_HOUR;
  const hours = getHoursRange(openHour, closeHour);

  // ดึงนัดที่มีอยู่แล้วในช่วงนี้ เพื่อข้ามช่องที่มีคนจองไว้ (ไม่ยกเลิกให้อัตโนมัติ)
  const existing = await db
    .select({ date: bookings.date, hour: bookings.hour })
    .from(bookings)
    .where(
      and(
        eq(bookings.trainerId, trainer.id),
        gte(bookings.date, fromDate),
        lte(bookings.date, toDate),
      ),
    );
  const bookedSet = new Set(existing.map((b) => `${b.date}_${b.hour}`));

  let blocked = 0;
  let skipped = 0;
  let cur = start;
  for (let i = 0; i < totalDays; i++) {
    const dateStr = toDateStr(cur);
    for (const h of hours) {
      if (bookedSet.has(`${dateStr}_${h}`)) {
        skipped++;
        continue;
      }
      try {
        await db
          .insert(blockedSlots)
          .values({ trainerId: trainer.id, date: dateStr, hour: h });
        blocked++;
      } catch (e) {
        if (!isDupError(e)) throw e;
      }
    }
    cur = addDays(cur, 1);
  }

  revalidatePath("/trainer/schedule");
  return {
    success:
      skipped > 0
        ? `ปิดรับ ${totalDays} วันแล้ว (ข้าม ${skipped} ช่วงที่มีคนจองอยู่แล้ว — ยกเลิกด้วยตนเองถ้าต้องการ)`
        : `ปิดรับ ${totalDays} วันเรียบร้อยแล้ว (${blocked} ช่วงเวลา)`,
  };
}

export async function unblockDateRangeAction(
  fromDate: string,
  toDate: string,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  if (!isValidDateStr(fromDate) || !isValidDateStr(toDate))
    return { error: "รูปแบบวันที่ไม่ถูกต้อง" };

  await db
    .delete(blockedSlots)
    .where(
      and(
        eq(blockedSlots.trainerId, trainer.id),
        gte(blockedSlots.date, fromDate),
        lte(blockedSlots.date, toDate),
      ),
    );

  revalidatePath("/trainer/schedule");
  return { success: "เปิดรับช่วงวันที่ดังกล่าวอีกครั้งแล้ว" };
}

/* ---------------- พักประจำวัน (ไม่รับเทรนช่วงเวลานี้ทุกวัน ตลอดไป) ---------------- */

export async function addRecurringBreakAction(
  fromHour: number,
  toHour: number,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");

  if (
    !Number.isInteger(fromHour) ||
    !Number.isInteger(toHour) ||
    fromHour < 0 ||
    fromHour > 23 ||
    toHour < 1 ||
    toHour > 24 ||
    toHour <= fromHour
  ) {
    return { error: "ช่วงเวลาไม่ถูกต้อง" };
  }

  for (let h = fromHour; h < toHour; h++) {
    try {
      await db
        .insert(recurringBreaks)
        .values({ trainerId: trainer.id, hour: h });
    } catch (e) {
      if (!isDupError(e)) throw e;
    }
  }

  revalidatePath("/trainer/schedule");
  revalidatePath("/client/schedule");
  return {
    success: `ตั้งพักประจำวันช่วง ${hourLabel(fromHour)}–${hourLabel(toHour)} แล้ว (ทุกวัน)`,
  };
}

export async function removeRecurringBreakAction(
  fromHour: number,
  toHour: number,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  if (
    !Number.isInteger(fromHour) ||
    !Number.isInteger(toHour) ||
    toHour <= fromHour
  ) {
    return { error: "ช่วงเวลาไม่ถูกต้อง" };
  }

  await db
    .delete(recurringBreaks)
    .where(
      and(
        eq(recurringBreaks.trainerId, trainer.id),
        gte(recurringBreaks.hour, fromHour),
        lte(recurringBreaks.hour, toHour - 1),
      ),
    );

  revalidatePath("/trainer/schedule");
  revalidatePath("/client/schedule");
  return { success: "ยกเลิกพักประจำวันช่วงนี้แล้ว" };
}
