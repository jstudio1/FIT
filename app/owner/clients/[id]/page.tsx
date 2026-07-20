import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import {
  users,
  clientProfiles,
  sessionResults,
  bookings,
  foodLogs,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { ResultsChart, type ResultPoint } from "@/components/results-chart";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5">{value || "—"}</div>
    </div>
  );
}

export default async function OwnerClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("OWNER");
  const { id } = await params;
  const clientId = Number(id);

  const trainerU = alias(users, "trainer");
  const [client] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      active: users.active,
      trainerName: trainerU.fullName,
    })
    .from(users)
    .leftJoin(trainerU, eq(trainerU.id, users.trainerId))
    .where(and(eq(users.id, clientId), eq(users.role, "CLIENT")))
    .limit(1);
  if (!client) notFound();

  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, clientId))
    .limit(1);

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

  const [bkCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(bookings)
    .where(eq(bookings.clientId, clientId));
  const [foodCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(foodLogs)
    .where(eq(foodLogs.clientId, clientId));

  return (
    <>
      <Link
        href="/owner/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปลูกเทรนทั้งหมด
      </Link>

      <div className="flex items-center gap-4 mb-2">
        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
          {client.fullName.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {client.fullName}
          </h1>
          <p className="text-sm text-muted-foreground">
            @{client.username} · เทรนเนอร์: {client.trainerName ?? "—"}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        มุมมองเจ้าของระบบ (อ่านอย่างเดียว) · การจอง {Number(bkCount?.c ?? 0)} ครั้ง
        · อาหาร {Number(foodCount?.c ?? 0)} รายการ
      </p>

      <div className="space-y-5">
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <h3 className="font-semibold mb-4">แนวโน้มผลลัพธ์</h3>
          <ResultsChart data={chartData} />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <h3 className="font-semibold mb-4">ประวัติลูกเทรน</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="เป้าหมาย" value={profile?.goals} />
            <Field label="ประวัติสุขภาพ" value={profile?.healthHistory} />
            <Field label="น้ำหนักเริ่มต้น" value={profile?.startWeight && `${profile.startWeight} กก.`} />
            <Field label="ส่วนสูง" value={profile?.startHeight && `${profile.startHeight} ซม.`} />
            <Field label="รอบเอวเริ่มต้น" value={profile?.startWaist && `${profile.startWaist} ซม.`} />
            <Field label="พื้นฐานออกกำลังกาย" value={profile?.exerciseBackground} />
            <Field label="การนอน" value={profile?.sleepPattern} />
            <Field label="ลักษณะงาน" value={profile?.workPattern} />
            <Field label="ออกกำลังกาย/สัปดาห์" value={profile?.daysPerWeek && `${profile.daysPerWeek} วัน`} />
            <Field label="มื้ออาหาร/วัน" value={profile?.mealsPerDay && `${profile.mealsPerDay} มื้อ`} />
            <Field label="ดื่มแอลกอฮอล์" value={profile?.alcoholFrequency} />
            <Field label="วินัย" value={profile?.disciplineNote} />
          </div>
        </div>
      </div>
    </>
  );
}
