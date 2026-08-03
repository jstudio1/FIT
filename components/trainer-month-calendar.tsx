"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type MonthBooking = { hour: number; timeLabel: string; clientName: string; status: string };
export type MonthDay = {
  dateStr: string;
  dayNum: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  bookings: MonthBooking[];
};

const WEEKDAY_SHORT = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const STATUS_LABEL: Record<string, string> = {
  BOOKED: "รอถึงเวลา",
  COMPLETED: "มาเทรน",
  NO_SHOW: "ขาด",
};

export function TrainerMonthCalendar({
  days,
  monthLabel,
  prevMonth,
  nextMonth,
}: {
  days: MonthDay[];
  monthLabel: string;
  prevMonth: string;
  nextMonth: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDay = days.find((d) => d.dateStr === selected);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <Link
          href={`/trainer/schedule?view=month&month=${prevMonth}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Link
          href={`/trainer/schedule?view=month&month=${nextMonth}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAY_SHORT.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => setSelected(d.dateStr === selected ? null : d.dateStr)}
              className={cn(
                "aspect-square sm:aspect-auto sm:h-20 border-b border-r border-border p-1.5 sm:p-2 flex flex-col items-start gap-1 text-left hover:bg-muted/50 transition-colors",
                !d.inCurrentMonth && "bg-muted/30 text-muted-foreground/50",
                selected === d.dateStr && "bg-accent",
              )}
            >
              <span
                className={cn(
                  "text-xs sm:text-sm",
                  d.isToday &&
                    "h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center",
                )}
              >
                {d.dayNum}
              </span>
              {d.bookings.length > 0 && (
                <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                  {d.bookings.length} นัด
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-4">
          <h4 className="text-sm font-semibold mb-2">{selectedDay.dateStr}</h4>
          {selectedDay.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มีนัดวันนี้</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDay.bookings
                .sort((a, b) => a.hour - b.hour)
                .map((b, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3.5" />
                      {b.timeLabel}
                    </span>
                    <span className="flex-1 truncate">{b.clientName}</span>
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full shrink-0",
                        b.status === "COMPLETED"
                          ? "bg-primary/10 text-primary"
                          : b.status === "NO_SHOW"
                            ? "bg-destructive/10 text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
