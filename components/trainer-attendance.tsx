"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";
import { markAttendanceAction } from "@/app/_actions/results";
import { cn } from "@/lib/utils";

export type BookingRow = {
  id: number;
  dateLabel: string;
  timeLabel: string;
  status: "BOOKED" | "COMPLETED" | "NO_SHOW";
  isPast: boolean;
};

export function TrainerAttendance({ bookings }: { bookings: BookingRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function mark(id: number, status: "COMPLETED" | "NO_SHOW") {
    startTransition(async () => {
      const res = await markAttendanceAction(id, status);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "บันทึกแล้ว");
      router.refresh();
    });
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground p-5">ยังไม่มีนัดเทรน</p>;
  }

  return (
    <div className="divide-y divide-border">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="flex items-center justify-between gap-3 px-5 py-3"
        >
          <div className="text-sm">
            <span className="font-medium">{b.dateLabel}</span>
            <span className="text-muted-foreground"> · {b.timeLabel}</span>
          </div>

          {!b.isPast ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> รอถึงเวลา
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                disabled={pending}
                onClick={() => mark(b.id, "COMPLETED")}
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50",
                  b.status === "COMPLETED"
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "border-border hover:bg-muted",
                )}
              >
                <Check className="size-3.5" /> มาเทรน
              </button>
              <button
                disabled={pending}
                onClick={() => mark(b.id, "NO_SHOW")}
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50",
                  b.status === "NO_SHOW"
                    ? "bg-destructive text-destructive-foreground border-transparent"
                    : "border-border hover:bg-muted",
                )}
              >
                <X className="size-3.5" /> ขาด
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
