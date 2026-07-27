import { addDays, subDays, format } from "date-fns";
import { and, eq, gte, inArray, isNull, isNotNull, lte, sql } from "drizzle-orm";
import { Users, UserCog, CalendarCheck, Clock, CheckCircle2, CalendarRange } from "lucide-react";
import { db } from "@/lib/db";
import { users, bookings, foodLogs, trainerSettings } from "@/lib/db/schema";
import {
  weekStart,
  toDateStr,
  getWeekDays,
  getHoursRange,
  isPastSlot,
  OPEN_HOUR,
  CLOSE_HOUR,
} from "@/lib/schedule";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SignupTrendChart, type SignupPoint } from "@/components/signup-trend-chart";
import { OwnerAggregateSchedule, type AggregateSlot } from "@/components/owner-aggregate-schedule";

export const dynamic = "force-dynamic";

export default async function OwnerOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;

  const ws = weekStart(new Date());
  const weekFrom = toDateStr(ws);
  const weekTo = toDateStr(addDays(ws, 6));
  const [weekBookings] = await db
    .select({ c: sql<number>`count(*)` })
    .from(bookings)
    .where(and(gte(bookings.date, weekFrom), lte(bookings.date, weekTo)));

  const [trainerCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "TRAINER"));
  const [activeTrainerCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.role} = 'TRAINER' and ${users.active} = 1`);
  const [clientCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "CLIENT"));

  // สถานะตรวจอาหาร
  const [pendingFood] = await db
    .select({ c: sql<number>`count(*)` })
    .from(foodLogs)
    .where(isNull(foodLogs.reviewedAt));
  const [reviewedFood] = await db
    .select({ c: sql<number>`count(*)` })
    .from(foodLogs)
    .where(isNotNull(foodLogs.reviewedAt));

  // อัตราการสมัคร 30 วันล่าสุด
  const thirtyDaysAgo = subDays(new Date(), 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const signupRows = await db
    .select({
      date: sql<string>`DATE(${users.createdAt})`,
      role: users.role,
      c: sql<number>`count(*)`,
    })
    .from(users)
    .where(and(inArray(users.role, ["CLIENT", "TRAINER"]), gte(users.createdAt, thirtyDaysAgo)))
    .groupBy(sql`DATE(${users.createdAt})`, users.role);

  const signupMap = new Map<string, { clients: number; trainers: number }>();
  for (const r of signupRows) {
    const entry = signupMap.get(r.date) ?? { clients: 0, trainers: 0 };
    if (r.role === "CLIENT") entry.clients = Number(r.c);
    else if (r.role === "TRAINER") entry.trainers = Number(r.c);
    signupMap.set(r.date, entry);
  }
  const signupData: SignupPoint[] = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(thirtyDaysAgo, i);
    const key = toDateStr(d);
    const entry = signupMap.get(key);
    return {
      date: format(d, "d/M"),
      clients: entry?.clients ?? 0,
      trainers: entry?.trainers ?? 0,
    };
  });

  // ตารางเทรนภาพรวมทุกเทรนเนอร์ (แบบนับจำนวน)
  const base =
    sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week)
      ? new Date(`${sp.week}T00:00:00`)
      : new Date();
  const days = getWeekDays(base);
  const scheduleWs = weekStart(base);
  const prevWeek = toDateStr(addDays(scheduleWs, -7));
  const nextWeek = toDateStr(addDays(scheduleWs, 7));
  const rangeLabel = `${days[0].dateStr} — ${days[6].dateStr}`;
  const rangeStart = days[0].dateStr;
  const rangeEnd = days[6].dateStr;
  const now = new Date();

  const allSettings = await db.select().from(trainerSettings);
  const openHour = allSettings.length
    ? Math.min(...allSettings.map((s) => s.openHour))
    : OPEN_HOUR;
  const closeHour = allSettings.length
    ? Math.max(...allSettings.map((s) => s.closeHour))
    : CLOSE_HOUR;
  const hours = getHoursRange(openHour, closeHour);

  const bookingRows = await db
    .select({ date: bookings.date, hour: bookings.hour, status: bookings.status })
    .from(bookings)
    .where(and(gte(bookings.date, rangeStart), lte(bookings.date, rangeEnd)));

  const aggSlots: Record<string, AggregateSlot> = {};
  for (const b of bookingRows) {
    const key = `${b.date}_${b.hour}`;
    const slot = aggSlots[key] ?? { waiting: 0, completed: 0, noShow: 0 };
    if (b.status === "COMPLETED") slot.completed++;
    else if (b.status === "NO_SHOW") slot.noShow++;
    else if (b.status === "BOOKED" && !isPastSlot(b.date, b.hour, now)) slot.waiting++;
    aggSlots[key] = slot;
  }

  return (
    <>
      <PageHeader
        title="ภาพรวมระบบ"
        description="สรุปภาพรวมทั้งระบบสำหรับเจ้าของ"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="เทรนเนอร์ทั้งหมด"
          value={Number(trainerCount?.c ?? 0)}
          icon={UserCog}
          hint={`ใช้งานอยู่ ${Number(activeTrainerCount?.c ?? 0)} คน`}
        />
        <StatCard
          label="ลูกเทรนทั้งหมด"
          value={Number(clientCount?.c ?? 0)}
          icon={Users}
        />
        <StatCard
          label="การจองสัปดาห์นี้"
          value={Number(weekBookings?.c ?? 0)}
          icon={CalendarCheck}
          hint={`${weekFrom} – ${weekTo}`}
        />
        <StatCard
          label="อาหารรอตรวจ"
          value={Number(pendingFood?.c ?? 0)}
          icon={Clock}
        />
        <StatCard
          label="อาหารตรวจแล้ว"
          value={Number(reviewedFood?.c ?? 0)}
          icon={CheckCircle2}
        />
      </div>

      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold mb-4">อัตราการสมัครสมาชิก (30 วันล่าสุด)</h3>
        <SignupTrendChart data={signupData} />
      </div>

      <div className="mt-8">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CalendarRange className="size-4.5 text-primary" />
          ตารางเทรนภาพรวม (ทุกเทรนเนอร์)
        </h3>
        <OwnerAggregateSchedule
          basePath="/owner"
          days={days.map((d) => ({ dateStr: d.dateStr, dayShort: d.dayShort, dayNum: d.dayNum }))}
          hours={hours}
          slots={aggSlots}
          prevWeek={prevWeek}
          nextWeek={nextWeek}
          rangeLabel={rangeLabel}
        />
      </div>

      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold mb-1">เริ่มต้นใช้งาน</h3>
        <p className="text-sm text-muted-foreground">
          ไปที่หน้า <span className="font-medium text-foreground">เทรนเนอร์</span>{" "}
          เพื่อสร้างบัญชีเทรนเนอร์ จากนั้นเทรนเนอร์แต่ละคนจะสร้างบัญชีลูกเทรนของตัวเองได้
        </p>
      </div>
    </>
  );
}
