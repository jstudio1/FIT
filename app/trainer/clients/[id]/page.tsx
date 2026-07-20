import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, ClipboardCheck, LineChart as LineChartIcon } from "lucide-react";
import { db } from "@/lib/db";
import {
  users,
  clientProfiles,
  bookings,
  sessionResults,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { isPastSlot, slotRangeLabel } from "@/lib/schedule";
import { ProfileForm } from "@/components/profile-form";
import {
  TrainerAttendance,
  type BookingRow,
} from "@/components/trainer-attendance";
import { ResultsChart, type ResultPoint } from "@/components/results-chart";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = Number(id);
  const trainer = await requireRole("TRAINER");

  const [client] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, clientId),
        eq(users.role, "CLIENT"),
        eq(users.trainerId, trainer.id),
      ),
    )
    .limit(1);
  if (!client) notFound();

  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, clientId))
    .limit(1);

  // นัดเทรน (เช็คการมาเทรน)
  const bkRows = await db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.clientId, clientId), eq(bookings.trainerId, trainer.id)),
    )
    .orderBy(desc(bookings.date), desc(bookings.hour));
  const now = new Date();
  const attendance: BookingRow[] = bkRows.map((b) => ({
    id: b.id,
    dateLabel: b.date,
    timeLabel: slotRangeLabel(b.hour),
    status: b.status,
    isPast: isPastSlot(b.date, b.hour, now),
  }));

  // ผลลัพธ์
  const results = await db
    .select()
    .from(sessionResults)
    .where(eq(sessionResults.clientId, clientId))
    .orderBy(asc(sessionResults.measuredAt));
  const chartData: ResultPoint[] = results.map((r) => ({
    date: format(r.measuredAt, "d/M"),
    weight: r.weight,
    waist: r.waist,
    muscleMass: r.muscleMass,
    bodyFat: r.bodyFat,
  }));

  return (
    <>
      <Link
        href="/trainer/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้ารายชื่อ
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
          {client.fullName.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            @{client.username} · ลูกเทรนของคุณ
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* กราฟผลลัพธ์ */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon className="size-4.5 text-primary" />
            <h3 className="font-semibold">แนวโน้มผลลัพธ์</h3>
          </div>
          <ResultsChart data={chartData} />
        </div>

        {/* การมาเทรน */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <ClipboardCheck className="size-4.5 text-primary" />
            <h3 className="font-semibold">การมาเทรน</h3>
          </div>
          <TrainerAttendance bookings={attendance} />
        </div>

        {/* ประวัติ */}
        <div>
          <h3 className="font-semibold mb-3">ประวัติลูกเทรน</h3>
          <ProfileForm clientId={clientId} profile={profile ?? null} />
        </div>
      </div>
    </>
  );
}
