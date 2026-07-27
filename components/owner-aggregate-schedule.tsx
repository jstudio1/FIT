import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { hourLabel, slotRangeLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";

type Day = { dateStr: string; dayShort: string; dayNum: string };
export type AggregateSlot = { waiting: number; completed: number; noShow: number };

/** ตารางเทรนภาพรวมทุกเทรนเนอร์ — แสดงจำนวนคนต่อช่อง ไม่ใช่ชื่อ (มุมมองเจ้าของระบบ) */
export function OwnerAggregateSchedule({
  basePath,
  days,
  hours,
  slots,
  prevWeek,
  nextWeek,
  rangeLabel,
}: {
  basePath: string;
  days: Day[];
  hours: number[];
  slots: Record<string, AggregateSlot>;
  prevWeek: string;
  nextWeek: string;
  rangeLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <Link
          href={`${basePath}?week=${prevWeek}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-sm font-medium">{rangeLabel}</span>
        <Link
          href={`${basePath}?week=${nextWeek}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-card">
        <table className="w-full border-collapse text-sm min-w-[720px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card w-16 p-2 text-xs text-muted-foreground font-medium border-b border-border">
                เวลา
              </th>
              {days.map((d) => (
                <th
                  key={d.dateStr}
                  className="p-2 text-center border-b border-l border-border font-medium"
                >
                  <div>{d.dayShort}</div>
                  <div className="text-xs text-muted-foreground">{d.dayNum}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <td className="sticky left-0 z-10 bg-card p-2 text-xs text-muted-foreground text-center border-b border-border whitespace-nowrap">
                  {hourLabel(h)}
                </td>
                {days.map((d) => {
                  const key = `${d.dateStr}_${h}`;
                  const slot = slots[key] ?? { waiting: 0, completed: 0, noShow: 0 };
                  return (
                    <td
                      key={d.dateStr}
                      className="p-1 border-b border-l border-border align-middle"
                    >
                      <AggregateCell slot={slot} title={slotRangeLabel(h)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-accent" /> รอถึงเวลาเทรน
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary/15 border border-primary/30" /> เทรนไปแล้ว
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-destructive/10 border border-destructive/30" /> ขาดนัด
        </span>
      </div>
    </div>
  );
}

function AggregateCell({ slot, title }: { slot: AggregateSlot; title: string }) {
  const base = "w-full h-9 rounded-md text-xs flex items-center justify-center gap-1";
  const total = slot.waiting + slot.completed + slot.noShow;

  if (total === 0) {
    return <div className={cn(base, "text-muted-foreground/30")}>—</div>;
  }

  return (
    <div
      className={cn(
        base,
        "flex-col gap-0.5 leading-tight py-1",
        slot.completed > 0 && "bg-primary/15",
        slot.waiting > 0 && slot.completed === 0 && "bg-accent",
      )}
      title={title}
    >
      {slot.waiting > 0 && <span className="text-muted-foreground">รอ {slot.waiting}</span>}
      {slot.completed > 0 && <span className="text-primary font-medium">เทรน {slot.completed}</span>}
      {slot.noShow > 0 && <span className="text-destructive">ขาด {slot.noShow}</span>}
    </div>
  );
}
