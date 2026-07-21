import Link from "next/link";
import { startOfMonth } from "date-fns";
import { CheckCircle2, XCircle, Ban, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { toDateStr } from "@/lib/schedule";
import { clampRangeForMode, type HourBucketMode } from "@/lib/training-hours";
import {
  fetchReportRecords,
  summarizeRecords,
  buildReportBuckets,
  sortAndCapRecords,
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

export default async function TrainerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; from?: string; to?: string }>;
}) {
  const trainer = await requireRole("TRAINER");
  const sp = await searchParams;

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

  const records = await fetchReportRecords([trainer.id], fromStr, toStr);
  const summary = summarizeRecords(records);
  const buckets = buildReportBuckets(mode, fromDate, toDate, records);
  const { rows, truncated } = sortAndCapRecords(records);

  return (
    <>
      <PageHeader
        title="รายงาน"
        description="ประวัติการเทรนและสรุปแต่ละสถานะของลูกเทรนคุณ"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1">
          {(Object.keys(MODE_LABEL) as HourBucketMode[]).map((m) => (
            <Link
              key={m}
              href={`/trainer/reports?mode=${m}&from=${fromStr}&to=${toStr}`}
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

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">ประวัติการเทรน</h3>
        <span className="text-xs text-muted-foreground">
          นับ &ldquo;ยกเลิก&rdquo; ตั้งแต่วันนี้เป็นต้นไป
        </span>
      </div>
      <ReportTable rows={rows} truncated={truncated} />
    </>
  );
}
