import { addDays, subDays, format } from "date-fns";
import { and, eq, gte, inArray, isNull, isNotNull, lte, sql } from "drizzle-orm";
import {
  Users,
  UserCog,
  CalendarCheck,
  Clock,
  CheckCircle2,
  CalendarRange,
  Star,
  Award,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  users,
  bookings,
  foodLogs,
  trainerSettings,
  pointEvents,
  clientBadges,
} from "@/lib/db/schema";
import {
  weekStart,
  toDateStr,
  getWeekDays,
  getHoursRange,
  isPastSlot,
  OPEN_HOUR,
  CLOSE_HOUR,
} from "@/lib/schedule";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SignupTrendChart, type SignupPoint } from "@/components/signup-trend-chart";
import { OwnerAggregateSchedule, type AggregateSlot } from "@/components/owner-aggregate-schedule";
import { OwnerLiveSessions, type LiveSessionRow } from "@/components/owner-live-sessions";

export const dynamic = "force-dynamic";

export default async function OwnerOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSiteSettings();

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

  // แต้มสะสม/Badge ทั้งระบบ (เฉพาะตอนเปิดใช้งานระบบแต้มสะสม)
  let totalPointsAllTime = 0;
  let totalBadgesUnlocked = 0;
  if (settings.gamificationEnabled) {
    const [pointsRow] = await db
      .select({ total: sql<number>`coalesce(sum(${pointEvents.points}), 0)` })
      .from(pointEvents);
    totalPointsAllTime = Number(pointsRow?.total ?? 0);
    const [badgeRow] = await db.select({ c: sql<number>`count(*)` }).from(clientBadges);
    totalBadgesUnlocked = Number(badgeRow?.c ?? 0);
  }

  // กำลังเทรนอยู่ตอนนี้ (real-time) — bookings ที่เริ่มจับเวลาแล้วแต่ยังไม่จบ
  const liveBookingRows = await db
    .select({
      id: bookings.id,
      trainerId: bookings.trainerId,
      clientId: bookings.clientId,
      sessionStartedAt: bookings.sessionStartedAt,
    })
    .from(bookings)
    .where(and(isNotNull(bookings.sessionStartedAt), isNull(bookings.sessionEndedAt)));

  const liveUserIds = [...new Set(liveBookingRows.flatMap((b) => [b.trainerId, b.clientId]))];
  const liveUsers = liveUserIds.length
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          nickname: users.nickname,
          avatarPath: users.avatarPath,
        })
        .from(users)
        .where(inArray(users.id, liveUserIds))
    : [];
  const liveUserMap = new Map(liveUsers.map((u) => [u.id, u]));
  const liveSessions: LiveSessionRow[] = liveBookingRows.map((b) => ({
    bookingId: b.id,
    trainerName: liveUserMap.get(b.trainerId)?.fullName ?? "—",
    clientId: b.clientId,
    clientName: liveUserMap.get(b.clientId)?.fullName ?? "—",
    clientNickname: liveUserMap.get(b.clientId)?.nickname ?? null,
    clientAvatarPath: liveUserMap.get(b.clientId)?.avatarPath ?? null,
    sessionStartedAt: b.sessionStartedAt!.toISOString(),
  }));

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

      <div style={{ "--stagger": 0 } as React.CSSProperties} className="animate-fade-up mb-6">
        <OwnerLiveSessions sessions={liveSessions} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          stagger={1}
          label="เทรนเนอร์ทั้งหมด"
          value={Number(trainerCount?.c ?? 0)}
          icon={UserCog}
          hint={`ใช้งานอยู่ ${Number(activeTrainerCount?.c ?? 0)} คน`}
        />
        <StatCard
          stagger={2}
          label="ลูกเทรนทั้งหมด"
          value={Number(clientCount?.c ?? 0)}
          icon={Users}
        />
        <StatCard
          stagger={3}
          label="การจองสัปดาห์นี้"
          value={Number(weekBookings?.c ?? 0)}
          icon={CalendarCheck}
          hint={`${weekFrom} – ${weekTo}`}
        />
        <StatCard
          stagger={4}
          label="อาหารรอตรวจ"
          value={Number(pendingFood?.c ?? 0)}
          icon={Clock}
        />
        <StatCard
          stagger={5}
          label="อาหารตรวจแล้ว"
          value={Number(reviewedFood?.c ?? 0)}
          icon={CheckCircle2}
        />
        {settings.gamificationEnabled && (
          <>
            <StatCard
              stagger={6}
              label="แต้มสะสมทั้งระบบ"
              value={totalPointsAllTime}
              icon={Star}
              hint="สะสมรวมทุกลูกเทรน"
            />
            <StatCard
              stagger={7}
              label="Badge ที่ปลดล็อกแล้ว"
              value={totalBadgesUnlocked}
              icon={Award}
              hint="รวมทุกลูกเทรน"
            />
          </>
        )}
      </div>

      <div
        style={{ "--stagger": 8 } as React.CSSProperties}
        className="animate-fade-up hover-lift mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm"
      >
        <h3 className="font-semibold mb-4">อัตราการสมัครสมาชิก (30 วันล่าสุด)</h3>
        <SignupTrendChart data={signupData} />
      </div>

      <div
        style={{ "--stagger": 9 } as React.CSSProperties}
        className="animate-fade-up mt-8"
      >
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

      <div
        style={{ "--stagger": 10 } as React.CSSProperties}
        className="animate-fade-up hover-lift mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm"
      >
        <h3 className="font-semibold mb-1">เริ่มต้นใช้งาน</h3>
        <p className="text-sm text-muted-foreground">
          ไปที่หน้า <span className="font-medium text-foreground">เทรนเนอร์</span>{" "}
          เพื่อสร้างบัญชีเทรนเนอร์ จากนั้นเทรนเนอร์แต่ละคนจะสร้างบัญชีลูกเทรนของตัวเองได้
        </p>
      </div>
    </>
  );
}
