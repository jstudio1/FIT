import Link from "next/link";
import { format, startOfMonth } from "date-fns";
import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import {
  Users,
  CalendarDays,
  UtensilsCrossed,
  ChevronRight,
  LineChart,
  Clock,
  Hourglass,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  users,
  bookings,
  foodLogs,
  foodComments,
  sessionResults,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { toDateStr, slotStart, slotRangeLabel } from "@/lib/schedule";
import {
  buildHourBuckets,
  clampRangeForMode,
  type HourBucketMode,
} from "@/lib/training-hours";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TrainingHoursChart } from "@/components/training-hours-chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MODE_LABEL: Record<HourBucketMode, string> = {
  day: "รายวัน",
  week: "รายสัปดาห์",
  month: "รายเดือน",
};

type Tone = "upcoming" | "active" | "done" | "completed" | "noshow";

function statusOf(
  dateStr: string,
  hour: number,
  status: "BOOKED" | "COMPLETED" | "NO_SHOW",
  now: Date,
): { label: string; tone: Tone } {
  const start = slotStart(dateStr, hour).getTime();
  const end = slotStart(dateStr, hour + 1).getTime();
  const t = now.getTime();

  if (status === "COMPLETED") return { label: "มาเทรน ✓", tone: "completed" };
  if (status === "NO_SHOW") return { label: "ขาด", tone: "noshow" };

  if (t >= end) return { label: "จบแล้ว", tone: "done" };
  if (t >= start) return { label: "กำลังเทรน", tone: "active" };
  return { label: "รอเทรน", tone: "upcoming" };
}

const TONE_STYLES: Record<Tone, string> = {
  upcoming: "bg-accent text-accent-foreground",
  active: "bg-primary text-primary-foreground animate-pulse",
  done: "bg-muted text-muted-foreground",
  completed: "bg-primary text-primary-foreground",
  noshow: "bg-destructive text-destructive-foreground",
};

export default async function TrainerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ hMode?: string; hFrom?: string; hTo?: string }>;
}) {
  const trainer = await requireRole("TRAINER");
  const sp = await searchParams;
  const today = toDateStr(new Date());
  const now = new Date();

  const [clientCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.role, "CLIENT"), eq(users.trainerId, trainer.id)));

  const [pendingFood] = await db
    .select({ c: sql<number>`count(*)` })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .leftJoin(foodComments, eq(foodComments.foodLogId, foodLogs.id))
    .where(and(eq(users.trainerId, trainer.id), isNull(foodComments.id)));

  const todays = await db
    .select({
      id: bookings.id,
      hour: bookings.hour,
      status: bookings.status,
      clientId: bookings.clientId,
      clientName: users.fullName,
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.clientId))
    .where(and(eq(bookings.trainerId, trainer.id), eq(bookings.date, today)))
    .orderBy(asc(bookings.hour));

  const remaining = todays.filter(
    (b) =>
      b.status === "BOOKED" &&
      slotStart(today, b.hour + 1).getTime() > now.getTime(),
  ).length;

  const recentResults = await db
    .select({
      id: sessionResults.id,
      clientId: sessionResults.clientId,
      clientName: users.fullName,
      measuredAt: sessionResults.measuredAt,
      phase: sessionResults.phase,
      weight: sessionResults.weight,
      waist: sessionResults.waist,
      muscleMass: sessionResults.muscleMass,
      bodyFat: sessionResults.bodyFat,
      note: sessionResults.note,
    })
    .from(sessionResults)
    .innerJoin(users, eq(users.id, sessionResults.clientId))
    .where(eq(users.trainerId, trainer.id))
    .orderBy(desc(sessionResults.measuredAt))
    .limit(10);

  // ชั่วโมงการเทรน (1 นัดที่ "มาเทรน" = 1 ชั่วโมง)
  const hMode: HourBucketMode =
    sp.hMode === "week" || sp.hMode === "month" ? sp.hMode : "day";
  const monthStart = startOfMonth(now);
  let hFromDate =
    sp.hFrom && /^\d{4}-\d{2}-\d{2}$/.test(sp.hFrom)
      ? new Date(`${sp.hFrom}T00:00:00`)
      : monthStart;
  let hToDate =
    sp.hTo && /^\d{4}-\d{2}-\d{2}$/.test(sp.hTo)
      ? new Date(`${sp.hTo}T00:00:00`)
      : now;
  if (hFromDate.getTime() > hToDate.getTime()) {
    [hFromDate, hToDate] = [hToDate, hFromDate];
  }
  const rangeClamp = clampRangeForMode(hMode, hFromDate, hToDate);
  hFromDate = rangeClamp.from;
  hToDate = rangeClamp.to;
  const hFromStr = toDateStr(hFromDate);
  const hToStr = toDateStr(hToDate);

  const completedRows = await db
    .select({ date: bookings.date })
    .from(bookings)
    .where(
      and(
        eq(bookings.trainerId, trainer.id),
        eq(bookings.status, "COMPLETED"),
        gte(bookings.date, hFromStr),
        lte(bookings.date, hToStr),
      ),
    );
  const completedDates = completedRows.map((r) => r.date);
  const hoursData = buildHourBuckets(hMode, hFromDate, hToDate, completedDates);
  const totalHours = completedDates.length;
  const spanDays = Math.max(
    1,
    Math.round((hToDate.getTime() - hFromDate.getTime()) / 86400000) + 1,
  );
  const avgPerDay = Math.round((totalHours / spanDays) * 10) / 10;

  return (
    <>
      <PageHeader
        title={`สวัสดี, ${trainer.fullName}`}
        description="ภาพรวมและตารางเทรนของวันนี้"
      />

      {/* สถิติ */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          label="ลูกเทรนทั้งหมด"
          value={Number(clientCount?.c ?? 0)}
          icon={Users}
        />
        <StatCard
          label="นัดวันนี้ทั้งหมด"
          value={todays.length}
          icon={CalendarDays}
          hint={`เหลือ ${remaining} นัด`}
        />
        <StatCard
          label="อาหารรอตรวจ"
          value={Number(pendingFood?.c ?? 0)}
          icon={UtensilsCrossed}
          hint="รูปที่ยังไม่ได้คอมเมนต์"
        />
      </div>

      {/* ชั่วโมงการเทรน */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4.5 text-primary" />
            <h3 className="font-semibold">ชั่วโมงการเทรน</h3>
          </div>
          <div className="flex items-center gap-1">
            {(Object.keys(MODE_LABEL) as HourBucketMode[]).map((m) => (
              <Link
                key={m}
                href={`/trainer?hMode=${m}&hFrom=${hFromStr}&hTo=${hToStr}`}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  hMode === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {MODE_LABEL[m]}
              </Link>
            ))}
          </div>
        </div>

        <form className="flex flex-wrap items-end gap-2 mb-5">
          <input type="hidden" name="hMode" value={hMode} />
          <div>
            <Label htmlFor="hFrom" className="text-xs">
              จากวันที่
            </Label>
            <Input
              id="hFrom"
              name="hFrom"
              type="date"
              defaultValue={hFromStr}
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="hTo" className="text-xs">
              ถึงวันที่
            </Label>
            <Input
              id="hTo"
              name="hTo"
              type="date"
              defaultValue={hToStr}
              className="h-9"
            />
          </div>
          <Button type="submit" size="sm" className="h-9">
            ดูช่วงนี้
          </Button>
        </form>

        <div className="grid gap-4 sm:grid-cols-2 mb-5">
          <StatCard
            label="ชั่วโมงเทรนรวม"
            value={`${totalHours} ชม.`}
            icon={Hourglass}
            hint={`${hFromStr} – ${hToStr}`}
          />
          <StatCard
            label="เฉลี่ยต่อวัน"
            value={`${avgPerDay} ชม./วัน`}
            icon={Clock}
          />
        </div>

        <TrainingHoursChart data={hoursData} />

        {rangeClamp.clamped && (
          <p className="text-xs text-muted-foreground mt-2">
            ช่วงที่เลือกกว้างเกินไปสำหรับมุมมอง{MODE_LABEL[hMode]} แสดงผลถึงวันที่ {hToStr}
          </p>
        )}
      </div>

      {/* ตารางวันนี้ */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4.5 text-primary" />
            <h3 className="font-semibold">ตารางวันนี้</h3>
            <span className="text-sm text-muted-foreground">({today})</span>
          </div>
          <span className="text-xs text-muted-foreground">
            เหลืออีก {remaining} นัด
          </span>
        </div>

        {todays.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            วันนี้ไม่มีนัดเทรน 🎉
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {todays.map((b) => {
              const s = statusOf(today, b.hour, b.status, now);
              const isDone = s.tone === "done";
              return (
                <li key={b.id}>
                  <Link
                    href={`/trainer/clients/${b.clientId}`}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors",
                      isDone && "opacity-60",
                    )}
                  >
                    <div className="w-24 shrink-0 text-sm font-medium tabular-nums">
                      {slotRangeLabel(b.hour)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "font-medium truncate",
                          isDone && "line-through",
                        )}
                      >
                        {b.clientName}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap",
                        TONE_STYLES[s.tone],
                      )}
                    >
                      {s.label}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* บันทึกผลลัพธ์ล่าสุด */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden mb-6">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
          <LineChart className="size-4.5 text-primary" />
          <h3 className="font-semibold">บันทึกผลลัพธ์ล่าสุด</h3>
        </div>

        {recentResults.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            ยังไม่มีลูกเทรนบันทึกผลลัพธ์
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recentResults.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/trainer/clients/${r.clientId}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold">
                    {r.clientName.charAt(0)}
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="font-medium text-sm truncate">
                      {r.clientName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(r.measuredAt, "dd/MM/yyyy")}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs px-2 py-0.5 rounded-full",
                      r.phase === "POST"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {r.phase === "POST" ? "หลังเทรน" : "ก่อนเทรน"}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {r.weight != null && (
                      <span>
                        น้ำหนัก{" "}
                        <span className="font-medium text-foreground">
                          {r.weight}
                        </span>{" "}
                        กก.
                      </span>
                    )}
                    {r.waist != null && (
                      <span>
                        รอบเอว{" "}
                        <span className="font-medium text-foreground">
                          {r.waist}
                        </span>{" "}
                        ซม.
                      </span>
                    )}
                    {r.muscleMass != null && (
                      <span>
                        กล้าม{" "}
                        <span className="font-medium text-foreground">
                          {r.muscleMass}
                        </span>{" "}
                        กก.
                      </span>
                    )}
                    {r.bodyFat != null && (
                      <span>
                        ไขมัน{" "}
                        <span className="font-medium text-foreground">
                          {r.bodyFat}
                        </span>{" "}
                        %
                      </span>
                    )}
                    {r.note && (
                      <span className="italic truncate max-w-[200px]">
                        “{r.note}”
                      </span>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
