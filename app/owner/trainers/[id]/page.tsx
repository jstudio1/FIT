import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays } from "date-fns";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import {
  ArrowLeft,
  Users,
  ChevronRight,
  Mail,
  Phone,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { users, bookings, blockedSlots, recurringBreaks, trainerSettings } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import {
  getHoursRange,
  getWeekDays,
  weekStart,
  toDateStr,
  isPastSlot,
  OPEN_HOUR,
  CLOSE_HOUR,
} from "@/lib/schedule";
import { EditTrainerForm } from "@/components/edit-trainer-form";
import { OwnerScheduleView } from "@/components/owner-schedule-view";
import type { TSlot } from "@/components/trainer-calendar";

export const dynamic = "force-dynamic";

export default async function OwnerTrainerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  await requireRole("OWNER");
  const { id } = await params;
  const trainerId = Number(id);
  const sp = await searchParams;

  const [trainer] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, trainerId), eq(users.role, "TRAINER")))
    .limit(1);
  if (!trainer) notFound();

  const clients = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "CLIENT"), eq(users.trainerId, trainerId)))
    .orderBy(desc(users.createdAt));

  const [setting] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainerId))
    .limit(1);
  const bookingOpen = setting ? setting.bookingOpen : true;
  const openHour = setting?.openHour ?? OPEN_HOUR;
  const closeHour = setting?.closeHour ?? CLOSE_HOUR;
  const hours = getHoursRange(openHour, closeHour);

  // ตารางเทรนรายสัปดาห์ (อ่านอย่างเดียว)
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
        eq(bookings.trainerId, trainerId),
        gte(bookings.date, rangeStart),
        lte(bookings.date, rangeEnd),
      ),
    );
  const bookedMap = new Map<string, { bookingId: number; clientName: string }>();
  for (const b of bks) bookedMap.set(`${b.date}_${b.hour}`, { bookingId: b.id, clientName: b.clientName });

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
  const blockedSet = new Set(blks.map((b) => `${b.date}_${b.hour}`));

  const recurRows = await db
    .select({ hour: recurringBreaks.hour })
    .from(recurringBreaks)
    .where(eq(recurringBreaks.trainerId, trainerId));
  const recurringHourSet = new Set(recurRows.map((r) => r.hour));

  const slots: Record<string, TSlot> = {};
  for (const d of days) {
    for (const h of hours) {
      const key = `${d.dateStr}_${h}`;
      if (bookedMap.has(key)) {
        const b = bookedMap.get(key)!;
        slots[key] = { status: "BOOKED", bookingId: b.bookingId, clientName: b.clientName };
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
      <Link
        href="/owner/trainers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายชื่อเทรนเนอร์
      </Link>

      <div className="mb-2">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold overflow-hidden">
            {trainer.avatarPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/avatar/${trainer.id}`}
                alt={trainer.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              trainer.fullName.charAt(0)
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {trainer.fullName}
              {trainer.nickname && (
                <span className="text-lg font-normal text-muted-foreground"> ({trainer.nickname})</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              @{trainer.username} · {trainer.active ? "ใช้งานอยู่" : "ปิดใช้งาน"} · ลูกเทรน {clients.length} คน
            </p>
          </div>
        </div>

        {(trainer.email || trainer.phone || trainer.bio) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
            {trainer.email && (
              <a href={`mailto:${trainer.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Mail className="size-3.5" />
                {trainer.email}
              </a>
            )}
            {trainer.phone && (
              <a href={`tel:${trainer.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="size-3.5" />
                {trainer.phone}
              </a>
            )}
          </div>
        )}
        {trainer.bio && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{trainer.bio}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3 mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
          <CalendarDays className="size-3.5" />
          เวลาทำการ {openHour}:00–{closeHour}:00
        </span>
        {setting?.autoNutritionEnabled && (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-3.5" />
            เปิดตรวจอาหารอัตโนมัติด้วย AI
          </span>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="size-4.5 text-primary" />
            ตารางเทรน
          </h3>
          <OwnerScheduleView
            basePath={`/owner/trainers/${trainerId}`}
            days={days.map((d) => ({ dateStr: d.dateStr, dayShort: d.dayShort, dayNum: d.dayNum }))}
            hours={hours}
            slots={slots}
            bookingOpen={bookingOpen}
            prevWeek={prevWeek}
            nextWeek={nextWeek}
            rangeLabel={rangeLabel}
          />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <h3 className="font-semibold mb-4">แก้ไขข้อมูลเทรนเนอร์</h3>
          <EditTrainerForm
            trainer={{
              id: trainer.id,
              fullName: trainer.fullName,
              username: trainer.username,
            }}
          />
        </div>

        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="size-4.5 text-primary" />
            ลูกเทรนภายใต้เทรนเนอร์คนนี้
          </h3>
          {clients.length === 0 ? (
            <div className="text-center py-10 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
              ยังไม่มีลูกเทรน
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/owner/clients/${c.id}`}
                  className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold overflow-hidden">
                    {c.avatarPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/avatar/${c.id}`}
                        alt={c.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      c.fullName.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {c.fullName}
                      {c.nickname && (
                        <span className="text-muted-foreground font-normal"> ({c.nickname})</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">@{c.username}</div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
