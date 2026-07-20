"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, X, Ban } from "lucide-react";
import {
  blockSlotAction,
  unblockSlotAction,
  trainerCancelBookingAction,
  toggleBookingOpenAction,
} from "@/app/_actions/booking";
import { hourLabel, slotRangeLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export type TSlotStatus = "FREE" | "BOOKED" | "BLOCKED" | "PAST";
export type TSlot = {
  status: TSlotStatus;
  bookingId?: number;
  clientName?: string;
};

type Day = { dateStr: string; dayShort: string; dayNum: string };

export function TrainerCalendar({
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
  slots: Record<string, TSlot>;
  bookingOpen: boolean;
  prevWeek: string;
  nextWeek: string;
  rangeLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string; success?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "สำเร็จ");
      router.refresh();
    });

  return (
    <div>
      {/* toggle + week nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <button
          disabled={pending}
          onClick={() => run(() => toggleBookingOpenAction(!bookingOpen))}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:opacity-50",
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
          {bookingOpen ? "เปิดรับจองอยู่" : "ปิดรับจองอยู่"} · คลิกเพื่อสลับ
        </button>

        <div className="flex items-center gap-2">
          <Link
            href={`/trainer/schedule?week=${prevWeek}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="text-sm font-medium">{rangeLabel}</span>
          <Link
            href={`/trainer/schedule?week=${nextWeek}`}
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
                      <TSlotCell
                        slot={slot}
                        disabled={pending}
                        title={slotRangeLabel(h)}
                        onBlock={() => run(() => blockSlotAction(d.dateStr, h))}
                        onUnblock={() =>
                          run(() => unblockSlotAction(d.dateStr, h))
                        }
                        onCancel={() => {
                          if (
                            slot.bookingId &&
                            confirm(
                              `ยกเลิกนัดของ ${slot.clientName ?? "ลูกเทรน"} (${slotRangeLabel(h)})? ระบบจะแจ้งเตือนลูกเทรน`,
                            )
                          )
                            run(() =>
                              trainerCancelBookingAction(slot.bookingId!),
                            );
                        }}
                      />
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
          <span className="h-3 w-3 rounded bg-primary" /> มีคนจอง (คลิก × เพื่อยกเลิก)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-dashed border-border" /> ว่าง (คลิกเพื่อปิด)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-muted" /> ปิดไว้ (คลิกเพื่อเปิด)
        </span>
      </div>
    </div>
  );
}

function TSlotCell({
  slot,
  disabled,
  title,
  onBlock,
  onUnblock,
  onCancel,
}: {
  slot: TSlot;
  disabled: boolean;
  title: string;
  onBlock: () => void;
  onUnblock: () => void;
  onCancel: () => void;
}) {
  const base =
    "w-full h-9 rounded-md text-xs flex items-center justify-center gap-1 px-1 transition-colors";

  switch (slot.status) {
    case "BOOKED":
      return (
        <div
          className={cn(
            base,
            "bg-primary text-primary-foreground justify-between",
          )}
          title={`${slot.clientName} · ${title}`}
        >
          <span className="truncate">{slot.clientName}</span>
          <button
            disabled={disabled}
            onClick={onCancel}
            className="shrink-0 rounded hover:bg-white/20 p-0.5 disabled:opacity-50"
            title="ยกเลิกนัด (แจ้งลูกเทรน)"
          >
            <X className="size-3.5" />
          </button>
        </div>
      );
    case "BLOCKED":
      return (
        <button
          disabled={disabled}
          onClick={onUnblock}
          title="คลิกเพื่อเปิดช่วงเวลานี้"
          className={cn(
            base,
            "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
          )}
        >
          <Ban className="size-3" /> ปิด
        </button>
      );
    case "FREE":
      return (
        <button
          disabled={disabled}
          onClick={onBlock}
          title="คลิกเพื่อปิดช่วงเวลานี้"
          className={cn(
            base,
            "border border-dashed border-border text-muted-foreground hover:bg-muted disabled:opacity-50",
          )}
        >
          ว่าง
        </button>
      );
    case "PAST":
    default:
      return <div className={cn(base, "text-muted-foreground/30")}>—</div>;
  }
}
