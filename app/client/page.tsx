import Link from "next/link";
import { format } from "date-fns";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { Target, CalendarDays, Camera, LineChart, ChefHat, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { clientProfiles, sessionResults, bookings } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { toDateStr, hourLabel } from "@/lib/schedule";
import { computeClientSteps } from "@/lib/profile-progress";
import { getDailyMenu } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";
import { ResultsChart, type ResultPoint } from "@/components/results-chart";
import { ProfileProgress } from "@/components/profile-progress";
import { MenuCard } from "@/components/menu-card";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const client = await requireRole("CLIENT");

  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, client.id))
    .limit(1);

  const results = await db
    .select()
    .from(sessionResults)
    .where(eq(sessionResults.clientId, client.id))
    .orderBy(asc(sessionResults.measuredAt));

  const today = toDateStr(new Date());
  const upcoming = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.clientId, client.id), gte(bookings.date, today)))
    .orderBy(asc(bookings.date), asc(bookings.hour))
    .limit(1);
  const next = upcoming[0];

  const chartData: ResultPoint[] = results.map((r) => ({
    date: format(r.measuredAt, "d/M"),
    weight: r.weight,
    waist: r.waist,
    muscleMass: r.muscleMass,
    bodyFat: r.bodyFat,
  }));
  const latest = results[results.length - 1];
  const hasHealthProfile = Boolean(profile?.goals || profile?.healthHistory);
  const profileSteps = computeClientSteps(client, hasHealthProfile);
  const dailyMenu = await getDailyMenu(5);

  const baseline = [
    { label: "น้ำหนักล่าสุด", value: latest?.weight ?? profile?.startWeight, unit: "กก." },
    { label: "รอบเอวล่าสุด", value: latest?.waist ?? profile?.startWaist, unit: "ซม." },
    { label: "มวลกล้ามล่าสุด", value: latest?.muscleMass ?? profile?.startMuscleMass, unit: "กก." },
    { label: "ไขมันล่าสุด", value: latest?.bodyFat ?? profile?.startBodyFat, unit: "%" },
  ];

  return (
    <>
      <PageHeader
        title={`สวัสดี, ${client.fullName}`}
        description="ภาพรวมการเทรนของคุณ"
      />

      {profileSteps.some((s) => !s.done) && (
        <div className="mb-4">
          <ProfileProgress steps={profileSteps} href="/client/profile" compact />
        </div>
      )}

      {/* เป้าหมาย + นัดถัดไป */}
      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="size-4.5 text-primary" />
            <h3 className="font-semibold">เป้าหมายของฉัน</h3>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {profile?.goals || "เทรนเนอร์ยังไม่ได้กำหนดเป้าหมาย"}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="size-4.5 text-primary" />
            <h3 className="font-semibold">นัดเทรนถัดไป</h3>
          </div>
          {next ? (
            <p className="text-sm">
              <span className="font-medium">{next.date}</span> เวลา{" "}
              <span className="font-medium">{hourLabel(next.hour)}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              ยังไม่มีนัด —{" "}
              <Link href="/client/schedule" className="text-primary underline">
                จองเวลา
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* baseline */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-4">
        {baseline.map((b) => (
          <div
            key={b.label}
            className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm"
          >
            <div className="text-sm text-muted-foreground">{b.label}</div>
            <div className="mt-1 text-2xl font-bold">
              {b.value != null ? b.value : "—"}
              {b.value != null && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {b.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* เมนูแนะนำวันนี้ */}
      {dailyMenu.length > 0 && (
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-sm mb-4">
          <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-5 pt-5 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                  <ChefHat className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">เมนูแนะนำวันนี้</h3>
                  <p className="text-xs text-muted-foreground">เลือกสรรมาให้แล้ว อัปเดตทุกวัน</p>
                </div>
              </div>
              <Link
                href="/client/menu"
                className="inline-flex items-center gap-1 shrink-0 text-xs font-medium text-primary hover:gap-1.5 transition-all"
              >
                ดูทั้งหมด
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-5 pt-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dailyMenu.map((m, i) => (
              <div key={m.id} className="w-36 sm:w-40 shrink-0 snap-start">
                <MenuCard menu={m} compact index={i} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* กราฟ */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LineChart className="size-4.5 text-primary" />
            <h3 className="font-semibold">แนวโน้มผลลัพธ์</h3>
          </div>
          <Link
            href="/client/results"
            className="text-sm text-primary hover:underline"
          >
            บันทึก/ดูทั้งหมด
          </Link>
        </div>
        <ResultsChart data={chartData} />
      </div>

      {/* quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/client/schedule"
          className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors"
        >
          <CalendarDays className="size-5 text-primary mb-2" />
          <div className="font-medium">จองเวลาเทรน</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            เลือกช่วงเวลาที่ว่าง
          </div>
        </Link>
        <Link
          href="/client/results"
          className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors"
        >
          <LineChart className="size-5 text-primary mb-2" />
          <div className="font-medium">บันทึกผลลัพธ์</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            หลังเทรนแต่ละครั้ง
          </div>
        </Link>
        <Link
          href="/client/food"
          className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors"
        >
          <Camera className="size-5 text-primary mb-2" />
          <div className="font-medium">ส่งรูปอาหาร</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            ถ่ายรูปอาหารให้เทรนเนอร์ตรวจ
          </div>
        </Link>
      </div>
    </>
  );
}
