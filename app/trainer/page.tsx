import Link from "next/link";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { Users, CalendarDays, UtensilsCrossed, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { users, bookings, foodLogs, foodComments } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { toDateStr, slotStart, slotRangeLabel } from "@/lib/schedule";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function TrainerDashboardPage() {
  const trainer = await requireRole("TRAINER");
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

  return (
    <>
      <PageHeader
        title={`สวัสดี, ${trainer.fullName}`}
        description="ภาพรวมและตารางเทรนของวันนี้"
      />

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

      {/* สถิติ */}
      <div className="grid gap-4 sm:grid-cols-3">
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
    </>
  );
}
