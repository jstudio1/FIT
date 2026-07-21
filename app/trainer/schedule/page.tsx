import { addDays } from "date-fns";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  blockedSlots,
  recurringBreaks,
  trainerSettings,
  users,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import {
  getHoursRange,
  getWeekDays,
  weekStart,
  toDateStr,
  isPastSlot,
  groupConsecutiveHours,
  OPEN_HOUR,
  CLOSE_HOUR,
} from "@/lib/schedule";
import { PageHeader } from "@/components/page-header";
import { TrainerCalendar, type TSlot } from "@/components/trainer-calendar";
import {
  TrainerScheduleSettings,
  type BlockedDayGroup,
} from "@/components/trainer-schedule-settings";

export const dynamic = "force-dynamic";

export default async function TrainerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const trainer = await requireRole("TRAINER");
  const sp = await searchParams;

  const base =
    sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week)
      ? new Date(`${sp.week}T00:00:00`)
      : new Date();
  const days = getWeekDays(base);
  const ws = weekStart(base);
  const prevWeek = toDateStr(addDays(ws, -7));
  const nextWeek = toDateStr(addDays(ws, 7));
  const rangeLabel = `${days[0].dateStr} — ${days[6].dateStr}`;
  const rangeStart = days[0].dateStr;
  const rangeEnd = days[6].dateStr;
  const now = new Date();

  const [setting] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainer.id))
    .limit(1);
  const bookingOpen = setting ? setting.bookingOpen : true;
  const openHour = setting?.openHour ?? OPEN_HOUR;
  const closeHour = setting?.closeHour ?? CLOSE_HOUR;
  const hours = getHoursRange(openHour, closeHour);

  const bks = await db
    .select({
      id: bookings.id,
      date: bookings.date,
      hour: bookings.hour,
      clientName: users.fullName,
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.clientId))
    .where(
      and(
        eq(bookings.trainerId, trainer.id),
        gte(bookings.date, rangeStart),
        lte(bookings.date, rangeEnd),
      ),
    );
  const bookedMap = new Map<string, { bookingId: number; clientName: string }>();
  for (const b of bks)
    bookedMap.set(`${b.date}_${b.hour}`, {
      bookingId: b.id,
      clientName: b.clientName,
    });

  const blks = await db
    .select()
    .from(blockedSlots)
    .where(
      and(
        eq(blockedSlots.trainerId, trainer.id),
        gte(blockedSlots.date, rangeStart),
        lte(blockedSlots.date, rangeEnd),
      ),
    );
  const blockedSet = new Set(blks.map((b) => `${b.date}_${b.hour}`));

  const recurRows = await db
    .select({ hour: recurringBreaks.hour })
    .from(recurringBreaks)
    .where(eq(recurringBreaks.trainerId, trainer.id));
  const recurringHourSet = new Set(recurRows.map((r) => r.hour));
  const recurringRanges = groupConsecutiveHours(recurRows.map((r) => r.hour));

  // ช่วงที่ปิดรับอยู่ตอนนี้ (วันนี้เป็นต้นไป) — สำหรับแผงตั้งค่า
  const today = toDateStr(now);
  const blockedGroupsRaw = await db
    .select({ date: blockedSlots.date, cnt: sql<number>`count(*)` })
    .from(blockedSlots)
    .where(
      and(eq(blockedSlots.trainerId, trainer.id), gte(blockedSlots.date, today)),
    )
    .groupBy(blockedSlots.date)
    .orderBy(asc(blockedSlots.date))
    .limit(60);
  const blockedDays: BlockedDayGroup[] = blockedGroupsRaw.map((g) => ({
    date: g.date,
    blockedCount: Number(g.cnt),
    totalHours: hours.length,
  }));

  const slots: Record<string, TSlot> = {};
  for (const d of days) {
    for (const h of hours) {
      const key = `${d.dateStr}_${h}`;
      if (bookedMap.has(key)) {
        const b = bookedMap.get(key)!;
        slots[key] = {
          status: "BOOKED",
          bookingId: b.bookingId,
          clientName: b.clientName,
        };
      } else if (isPastSlot(d.dateStr, h, now)) {
        slots[key] = { status: "PAST" };
      } else if (recurringHourSet.has(h)) {
        slots[key] = { status: "RECURRING" };
      } else if (blockedSet.has(key)) {
        slots[key] = { status: "BLOCKED" };
      } else {
        slots[key] = { status: "FREE" };
      }
    }
  }

  return (
    <>
      <PageHeader
        title="ตารางเทรน"
        description="ดูผู้จอง ปิด/เปิดช่วงเวลา และจัดการการรับจอง"
      />

      <TrainerScheduleSettings
        openHour={openHour}
        closeHour={closeHour}
        blockedDays={blockedDays}
        recurringRanges={recurringRanges}
      />

      <TrainerCalendar
        days={days.map((d) => ({
          dateStr: d.dateStr,
          dayShort: d.dayShort,
          dayNum: d.dayNum,
        }))}
        hours={hours}
        slots={slots}
        bookingOpen={bookingOpen}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        rangeLabel={rangeLabel}
      />
    </>
  );
}
