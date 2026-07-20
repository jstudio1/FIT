import { addDays } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, blockedSlots, trainerSettings, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import {
  HOURS,
  getWeekDays,
  weekStart,
  toDateStr,
  isPastSlot,
} from "@/lib/schedule";
import { PageHeader } from "@/components/page-header";
import { TrainerCalendar, type TSlot } from "@/components/trainer-calendar";

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

  const [setting] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainer.id))
    .limit(1);
  const bookingOpen = setting ? setting.bookingOpen : true;

  const slots: Record<string, TSlot> = {};
  for (const d of days) {
    for (const h of HOURS) {
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
      <TrainerCalendar
        days={days.map((d) => ({
          dateStr: d.dateStr,
          dayShort: d.dayShort,
          dayNum: d.dayNum,
        }))}
        hours={HOURS}
        slots={slots}
        bookingOpen={bookingOpen}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        rangeLabel={rangeLabel}
      />
    </>
  );
}
