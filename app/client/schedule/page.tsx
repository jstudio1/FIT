import { addDays } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, blockedSlots, trainerSettings } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import {
  HOURS,
  getWeekDays,
  weekStart,
  toDateStr,
  isPastSlot,
  canCancelSlot,
} from "@/lib/schedule";
import { PageHeader } from "@/components/page-header";
import { ClientCalendar, type Slot } from "@/components/client-calendar";

export const dynamic = "force-dynamic";

export default async function ClientSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const client = await requireRole("CLIENT");
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

  const trainerId = client.trainerId;
  const now = new Date();

  const bookedMap = new Map<string, { clientId: number; bookingId: number }>();
  const blockedSet = new Set<string>();
  let bookingOpen = true;

  if (trainerId) {
    const rangeStart = days[0].dateStr;
    const rangeEnd = days[6].dateStr;

    const bks = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.trainerId, trainerId),
          gte(bookings.date, rangeStart),
          lte(bookings.date, rangeEnd),
        ),
      );
    for (const b of bks)
      bookedMap.set(`${b.date}_${b.hour}`, {
        clientId: b.clientId,
        bookingId: b.id,
      });

    const blks = await db
      .select()
      .from(blockedSlots)
      .where(
        and(
          eq(blockedSlots.trainerId, trainerId),
          gte(blockedSlots.date, rangeStart),
          lte(blockedSlots.date, rangeEnd),
        ),
      );
    for (const b of blks) blockedSet.add(`${b.date}_${b.hour}`);

    const [setting] = await db
      .select()
      .from(trainerSettings)
      .where(eq(trainerSettings.trainerId, trainerId))
      .limit(1);
    if (setting) bookingOpen = setting.bookingOpen;
  }

  const slots: Record<string, Slot> = {};
  for (const d of days) {
    for (const h of HOURS) {
      const key = `${d.dateStr}_${h}`;
      let slot: Slot;
      if (isPastSlot(d.dateStr, h, now)) {
        slot = { status: "PAST" };
      } else if (blockedSet.has(key)) {
        slot = { status: "BLOCKED" };
      } else if (bookedMap.has(key)) {
        const b = bookedMap.get(key)!;
        if (b.clientId === client.id) {
          slot = {
            status: "MINE",
            bookingId: b.bookingId,
            canCancel: canCancelSlot(d.dateStr, h, now),
          };
        } else {
          slot = { status: "TAKEN" };
        }
      } else if (!bookingOpen) {
        slot = { status: "CLOSED" };
      } else {
        slot = { status: "FREE" };
      }
      slots[key] = slot;
    }
  }

  return (
    <>
      <PageHeader
        title="จองเวลาเทรน"
        description="เลือกช่องเวลาที่ว่าง (จันทร์–อาทิตย์ 08:00–20:00) · ยกเลิกได้ก่อนเวลาอย่างน้อย 6 ชม."
      />
      {!trainerId ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          บัญชีของคุณยังไม่ได้ผูกกับเทรนเนอร์ กรุณาติดต่อเทรนเนอร์
        </div>
      ) : (
        <ClientCalendar
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
      )}
    </>
  );
}
