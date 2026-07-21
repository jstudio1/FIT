import { slotRangeLabel } from "@/lib/schedule";
import type { ReportRecord } from "@/lib/reports";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ReportRecord["status"], string> = {
  COMPLETED: "bg-accent text-accent-foreground",
  NO_SHOW: "bg-destructive text-destructive-foreground",
  CANCELLED: "bg-amber-100 text-amber-700",
};
const STATUS_LABEL: Record<ReportRecord["status"], string> = {
  COMPLETED: "สำเร็จ",
  NO_SHOW: "ขาด",
  CANCELLED: "ยกเลิก",
};

export function ReportTable({
  rows,
  showTrainer,
  truncated,
}: {
  rows: ReportRecord[];
  showTrainer?: boolean;
  truncated?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
        ยังไม่มีประวัติการเทรนในช่วงนี้
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2.5">วันที่</th>
              <th className="text-left font-medium px-4 py-2.5">เวลา</th>
              <th className="text-left font-medium px-4 py-2.5">ลูกเทรน</th>
              {showTrainer && (
                <th className="text-left font-medium px-4 py-2.5">เทรนเนอร์</th>
              )}
              <th className="text-left font-medium px-4 py-2.5">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                  {slotRangeLabel(r.hour)}
                </td>
                <td className="px-4 py-2.5">{r.clientName}</td>
                {showTrainer && (
                  <td className="px-4 py-2.5">{r.trainerName}</td>
                )}
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                      STATUS_STYLE[r.status],
                    )}
                  >
                    {STATUS_LABEL[r.status]}
                    {r.status === "CANCELLED" &&
                      (r.cancelledBy === "TRAINER" ? " (เทรนเนอร์)" : " (ลูกเทรน)")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated && (
        <p className="text-xs text-muted-foreground px-5 py-2.5 border-t border-border">
          แสดงเฉพาะ {rows.length} รายการล่าสุด — จำกัดช่วงวันที่ให้แคบลงเพื่อดูครบ
        </p>
      )}
    </div>
  );
}
