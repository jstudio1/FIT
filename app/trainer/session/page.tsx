import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { toDateStr, slotStart, slotRangeLabel } from "@/lib/schedule";
import { PageHeader } from "@/components/page-header";
import { LiveSessionPanel, type SessionBooking } from "@/components/live-session";

export const dynamic = "force-dynamic";

export default async function TrainerSessionPage() {
  const trainer = await requireRole("TRAINER");
  const { sessionDurationMin } = await getSiteSettings();
  const now = new Date();
  const today = toDateStr(now);

  const rows = await db
    .select({
      id: bookings.id,
      hour: bookings.hour,
      status: bookings.status,
      sessionStartedAt: bookings.sessionStartedAt,
      durationMinutes: bookings.durationMinutes,
      durationNote: bookings.durationNote,
      clientId: users.id,
      clientName: users.fullName,
      nickname: users.nickname,
      avatarPath: users.avatarPath,
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.clientId))
    .where(and(eq(bookings.trainerId, trainer.id), eq(bookings.date, today)))
    .orderBy(asc(bookings.hour));

  const items: SessionBooking[] = rows.map((r) => ({
    id: r.id,
    timeLabel: slotRangeLabel(r.hour),
    status: r.status,
    clientId: r.clientId,
    clientName: r.clientName,
    nickname: r.nickname,
    avatarPath: r.avatarPath,
    isDue:
      r.status === "BOOKED" &&
      !r.sessionStartedAt &&
      slotStart(today, r.hour).getTime() <= now.getTime(),
    isLive: r.status === "BOOKED" && !!r.sessionStartedAt,
    sessionStartedAt: r.sessionStartedAt ? r.sessionStartedAt.toISOString() : null,
    durationMinutes: r.durationMinutes,
    durationNote: r.durationNote,
  }));

  return (
    <>
      <PageHeader
        title="เริ่ม Session"
        description="เริ่ม/จบการจับเวลาเทรนของวันนี้ ทีละคน"
      />
      <LiveSessionPanel items={items} sessionDurationMin={sessionDurationMin} />
    </>
  );
}
