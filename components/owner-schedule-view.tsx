import Link from "next/link";
import { ChevronLeft, ChevronRight, Coffee } from "lucide-react";
import { hourLabel, slotRangeLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { TSlot } from "@/components/trainer-calendar";

type Day = { dateStr: string; dayShort: string; dayNum: string };

/** ตารางเทรนแบบดูอย่างเดียว สำหรับมุมมองเจ้าของระบบ (ไม่มีปุ่มจัดการใดๆ) */
export function OwnerScheduleView({
  basePath,
  days,
  hours,
  slots,
  bookingOpen,
  prevWeek,
  nextWeek,
  rangeLabel,
}: {
  basePath: string;
  days: Day[];
  hours: number[];
  slots: Record<string, TSlot>;
  bookingOpen: boolean;
  prevWeek: string;
  nextWeek: string;
  rangeLabel: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border",
            bookingOpen
              ? "bg-accent text-accent-foreground border-transparent"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              bookingOpen ? "bg-primary" : "bg-muted-foreground/50",
            )}
          />
          {bookingOpen ? "เปิดรับจองอยู่" : "ปิดรับจองอยู่"}
        </span>

        <div className="flex items-center gap-2">
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
                  const slot = slots[key] ?? { status: "FREE" };
                  return (
                    <td
                      key={d.dateStr}
                      className="p-1 border-b border-l border-border align-middle"
                    >
                      <ReadOnlySlotCell slot={slot} title={slotRangeLabel(h)} />
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
          <span className="h-3 w-3 rounded bg-primary" /> มีคนจอง
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-dashed border-border" /> ว่าง
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-muted" /> ปิดรับ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-100 border border-amber-300" /> พักประจำวัน
        </span>
      </div>
    </div>
  );
}

function ReadOnlySlotCell({ slot, title }: { slot: TSlot; title: string }) {
  const base =
    "w-full h-9 rounded-md text-xs flex items-center justify-center gap-1 px-1";

  switch (slot.status) {
    case "BOOKED":
      return (
        <div className={cn(base, "bg-primary text-primary-foreground")} title={`${slot.clientName} · ${title}`}>
          <span className="truncate">{slot.clientName}</span>
        </div>
      );
    case "BLOCKED":
      return <div className={cn(base, "bg-muted text-muted-foreground")}>ปิด</div>;
    case "FREE":
      return <div className={cn(base, "border border-dashed border-border text-muted-foreground")}>ว่าง</div>;
    case "RECURRING":
      return (
        <div className={cn(base, "bg-amber-100 text-amber-700")} title="พักประจำวัน">
          <Coffee className="size-3" /> พัก
        </div>
      );
    case "PAST":
    default:
      return <div className={cn(base, "text-muted-foreground/30")}>—</div>;
  }
}
