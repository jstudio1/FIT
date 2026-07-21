"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, X, Lock, Check } from "lucide-react";
import { bookSlotAction, cancelBookingAction } from "@/app/_actions/booking";
import { hourLabel, slotRangeLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export type SlotStatus =
  | "FREE"
  | "MINE"
  | "TAKEN"
  | "BLOCKED"
  | "RECURRING"
  | "PAST"
  | "CLOSED";

export type Slot = { status: SlotStatus; bookingId?: number; canCancel?: boolean };

type Day = { dateStr: string; dayShort: string; dayNum: string };

export function ClientCalendar({
  days,
  hours,
  slots,
  bookingOpen,
  prevWeek,
  nextWeek,
  rangeLabel,
}: {
  days: Day[];
  hours: number[];
  slots: Record<string, Slot>;
  bookingOpen: boolean;
  prevWeek: string;
  nextWeek: string;
  rangeLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function book(dateStr: string, hour: number) {
    startTransition(async () => {
      const res = await bookSlotAction(dateStr, hour);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "จองสำเร็จ");
      router.refresh();
    });
  }

  function cancel(bookingId: number) {
    if (!confirm("ยืนยันยกเลิกการจองนี้?")) return;
    startTransition(async () => {
      const res = await cancelBookingAction(bookingId);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "ยกเลิกแล้ว");
      router.refresh();
    });
  }

  return (
    <div>
      {/* week nav */}
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/client/schedule?week=${prevWeek}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted"
        >
          <ChevronLeft className="size-4" /> สัปดาห์ก่อน
        </Link>
        <span className="text-sm font-medium">{rangeLabel}</span>
        <Link
          href={`/client/schedule?week=${nextWeek}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted"
        >
          สัปดาห์ถัดไป <ChevronRight className="size-4" />
        </Link>
      </div>

      {!bookingOpen && (
        <div className="mb-3 text-sm rounded-md bg-muted text-muted-foreground px-3 py-2">
          เทรนเนอร์ปิดรับการจองชั่วคราว — จองใหม่ไม่ได้ แต่ยังยกเลิกนัดเดิมได้
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-card">
        <table className="w-full border-collapse text-sm min-w-[640px]">
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
                  const slot = slots[`${d.dateStr}_${h}`] ?? { status: "FREE" };
                  return (
                    <td
                      key={d.dateStr}
                      className="p-1 border-b border-l border-border align-middle"
                    >
                      <SlotCell
                        slot={slot}
                        disabled={pending}
                        onBook={() => book(d.dateStr, h)}
                        onCancel={() => slot.bookingId && cancel(slot.bookingId)}
                        title={slotRangeLabel(h)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Legend />
    </div>
  );
}

function SlotCell({
  slot,
  disabled,
  onBook,
  onCancel,
  title,
}: {
  slot: Slot;
  disabled: boolean;
  onBook: () => void;
  onCancel: () => void;
  title: string;
}) {
  const base =
    "w-full h-9 rounded-md text-xs flex items-center justify-center gap-1 transition-colors";

  switch (slot.status) {
    case "FREE":
      return (
        <button
          disabled={disabled}
          onClick={onBook}
          title={`จอง ${title}`}
          className={cn(
            base,
            "border border-dashed border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50",
          )}
        >
          ว่าง
        </button>
      );
    case "MINE":
      return (
        <button
          disabled={disabled || !slot.canCancel}
          onClick={onCancel}
          title={slot.canCancel ? "คลิกเพื่อยกเลิก" : "ยกเลิกไม่ได้ (เหลือ < 6 ชม.)"}
          className={cn(
            base,
            "bg-primary text-primary-foreground group hover:bg-destructive disabled:opacity-90",
          )}
        >
          {slot.canCancel ? (
            <>
              <Check className="size-3.5 group-hover:hidden" />
              <X className="size-3.5 hidden group-hover:block" />
              <span className="group-hover:hidden">ของคุณ</span>
              <span className="hidden group-hover:block">ยกเลิก</span>
            </>
          ) : (
            <>
              <Lock className="size-3" /> ของคุณ
            </>
          )}
        </button>
      );
    case "TAKEN":
      return (
        <div className={cn(base, "bg-muted text-muted-foreground")}>ไม่ว่าง</div>
      );
    case "BLOCKED":
      return (
        <div
          className={cn(
            base,
            "bg-muted text-muted-foreground/70 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)]",
          )}
        >
          ปิด
        </div>
      );
    case "RECURRING":
      return (
        <div className={cn(base, "bg-amber-100 text-amber-700")}>
          พักประจำ
        </div>
      );
    case "CLOSED":
      return <div className={cn(base, "text-muted-foreground/50")}>—</div>;
    case "PAST":
    default:
      return <div className={cn(base, "text-muted-foreground/30")}>—</div>;
  }
}

function Legend() {
  const items = [
    { label: "ว่าง (จองได้)", cls: "border border-dashed border-primary/40" },
    { label: "ของคุณ", cls: "bg-primary" },
    { label: "ไม่ว่าง", cls: "bg-muted" },
    { label: "ปิด", cls: "bg-muted" },
    { label: "พักประจำวัน", cls: "bg-amber-100" },
  ];
  return (
    <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-3 w-3 rounded", i.cls)} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
