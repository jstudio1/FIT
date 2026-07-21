import Link from "next/link";
import { startOfMonth } from "date-fns";
import { eq } from "drizzle-orm";
import {
  CheckCircle2,
  XCircle,
  Ban,
  ClipboardList,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { toDateStr } from "@/lib/schedule";
import { clampRangeForMode, type HourBucketMode } from "@/lib/training-hours";
import {
  fetchReportRecords,
  summarizeRecords,
  buildReportBuckets,
  sortAndCapRecords,
  type ReportSummary,
} from "@/lib/reports";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ReportChart } from "@/components/report-chart";
import { ReportTable } from "@/components/report-table";
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

export default async function OwnerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    from?: string;
    to?: string;
    trainerId?: string;
  }>;
}) {
  await requireRole("OWNER");
  const sp = await searchParams;

  const allTrainers = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.role, "TRAINER"))
    .orderBy(users.fullName);

  const selectedTrainerIdNum = sp.trainerId ? Number(sp.trainerId) : null;
  const selectedTrainer =
    selectedTrainerIdNum != null
      ? allTrainers.find((t) => t.id === selectedTrainerIdNum) ?? null
      : null;
  const trainerIds = selectedTrainer
    ? [selectedTrainer.id]
    : allTrainers.map((t) => t.id);

  const mode: HourBucketMode =
    sp.mode === "week" || sp.mode === "month" ? sp.mode : "day";
  const now = new Date();
  let fromDate =
    sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)
      ? new Date(`${sp.from}T00:00:00`)
      : startOfMonth(now);
  let toDate =
    sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)
      ? new Date(`${sp.to}T00:00:00`)
      : now;
  if (fromDate.getTime() > toDate.getTime()) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  const clamp = clampRangeForMode(mode, fromDate, toDate);
  fromDate = clamp.from;
  toDate = clamp.to;
  const fromStr = toDateStr(fromDate);
  const toStr = toDateStr(toDate);

  const records = await fetchReportRecords(trainerIds, fromStr, toStr);
  const summary = summarizeRecords(records);
  const buckets = buildReportBuckets(mode, fromDate, toDate, records);
  const { rows, truncated } = sortAndCapRecords(records);

  const trainerQS = selectedTrainer ? `&trainerId=${selectedTrainer.id}` : "";

  let perTrainerRows: (ReportSummary & { trainerId: number; trainerName: string })[] = [];
  if (!selectedTrainer) {
    const byTrainer = new Map<number, ReportSummary>();
    for (const t of allTrainers) {
      byTrainer.set(t.id, { completed: 0, noShow: 0, cancelled: 0, total: 0 });
    }
    for (const r of records) {
      const s = byTrainer.get(r.trainerId);
      if (!s) continue;
      if (r.status === "COMPLETED") s.completed++;
      else if (r.status === "NO_SHOW") s.noShow++;
      else s.cancelled++;
      s.total++;
    }
    perTrainerRows = allTrainers.map((t) => ({
      trainerId: t.id,
      trainerName: t.fullName,
      ...byTrainer.get(t.id)!,
    }));
  }

  return (
    <>
      <PageHeader
        title="รายงาน"
        description="ภาพรวมทั้งระบบ หรือเจาะดูรายเทรนเนอร์"
      />

      {selectedTrainer && (
        <div className="mb-4">
          <Link
            href={`/owner/reports?mode=${mode}&from=${fromStr}&to=${toStr}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            กลับไปภาพรวมทั้งหมด
          </Link>
          <p className="text-sm mt-1">
            กำลังดู:{" "}
            <span className="font-medium">{selectedTrainer.fullName}</span>
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1">
          {(Object.keys(MODE_LABEL) as HourBucketMode[]).map((m) => (
            <Link
              key={m}
              href={`/owner/reports?mode=${m}&from=${fromStr}&to=${toStr}${trainerQS}`}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {MODE_LABEL[m]}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="mode" value={mode} />
          {selectedTrainer && (
            <input type="hidden" name="trainerId" value={selectedTrainer.id} />
          )}
          <div>
            <Label htmlFor="from" className="text-xs">
              จากวันที่
            </Label>
            <Input id="from" name="from" type="date" defaultValue={fromStr} className="h-9" />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">
              ถึงวันที่
            </Label>
            <Input id="to" name="to" type="date" defaultValue={toStr} className="h-9" />
          </div>
          <Button type="submit" size="sm" className="h-9">
            ดูช่วงนี้
          </Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="สำเร็จ" value={summary.completed} icon={CheckCircle2} />
        <StatCard label="ขาด" value={summary.noShow} icon={XCircle} />
        <StatCard label="ยกเลิก" value={summary.cancelled} icon={Ban} />
        <StatCard label="รวมทั้งหมด" value={summary.total} icon={ClipboardList} />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 mb-6">
        <ReportChart data={buckets} />
        {clamp.clamped && (
          <p className="text-xs text-muted-foreground mt-2">
            ช่วงที่เลือกกว้างเกินไปสำหรับมุมมอง{MODE_LABEL[mode]} แสดงผลถึงวันที่ {toStr}
          </p>
        )}
      </div>

      {!selectedTrainer && perTrainerRows.length > 0 && (
        <>
          <h3 className="font-semibold mb-3">สรุปแยกตามเทรนเนอร์</h3>
          <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-5 py-2.5">เทรนเนอร์</th>
                    <th className="text-right font-medium px-4 py-2.5">สำเร็จ</th>
                    <th className="text-right font-medium px-4 py-2.5">ขาด</th>
                    <th className="text-right font-medium px-4 py-2.5">ยกเลิก</th>
                    <th className="text-right font-medium px-4 py-2.5">รวม</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {perTrainerRows.map((t) => (
                    <tr key={t.trainerId} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 font-medium">{t.trainerName}</td>
                      <td className="px-4 py-2.5 text-right">{t.completed}</td>
                      <td className="px-4 py-2.5 text-right">{t.noShow}</td>
                      <td className="px-4 py-2.5 text-right">{t.cancelled}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{t.total}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/owner/reports?mode=${mode}&from=${fromStr}&to=${toStr}&trainerId=${t.trainerId}`}
                          className="inline-flex items-center gap-0.5 text-primary hover:underline whitespace-nowrap"
                        >
                          ดูรายละเอียด
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">
          ประวัติการเทรน{selectedTrainer ? "" : " (ทุกเทรนเนอร์)"}
        </h3>
        <span className="text-xs text-muted-foreground">
          นับ &ldquo;ยกเลิก&rdquo; ตั้งแต่วันนี้เป็นต้นไป
        </span>
      </div>
      <ReportTable rows={rows} showTrainer={!selectedTrainer} truncated={truncated} />
    </>
  );
}
