"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Clock, Play, Square, Timer } from "lucide-react";
import {
  markAttendanceAction,
  startTrainingAction,
  stopTrainingAction,
  cancelTrainingStartAction,
} from "@/app/_actions/results";
import { cn } from "@/lib/utils";

export type BookingRow = {
  id: number;
  dateLabel: string;
  timeLabel: string;
  status: "BOOKED" | "COMPLETED" | "NO_SHOW";
  isPast: boolean;
  isToday: boolean; // เริ่มจับเวลาได้เฉพาะนัดของวันนี้ — นัดเก่าข้ามวันให้มาเทรนแบบไม่จับเวลาแทน
  sessionStartedAt: string | null; // ISO — มีค่า = กำลังจับเวลาอยู่ (ถ้ายังไม่จบ)
  durationMinutes: number | null; // เวลาที่ใช้จริง (นาที) — มีค่าเมื่อจบเทรนผ่านการจับเวลา
  durationNote: string | null; // เหตุผลถ้าเวลาที่ใช้ไม่ตรง 1 ชั่วโมง
};

const STATUS_LABEL: Record<BookingRow["status"], string> = {
  BOOKED: "รอถึงเวลา",
  COMPLETED: "มาเทรน",
  NO_SHOW: "ขาด",
};

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );
  return (
    <span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums text-primary">
      <Timer className="size-3.5" />
      {formatElapsed(seconds)}
    </span>
  );
}

export function TrainerAttendance({
  bookings,
  readOnly = false,
}: {
  bookings: BookingRow[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  function mark(id: number, status: "COMPLETED" | "NO_SHOW") {
    startTransition(async () => {
      const res = await markAttendanceAction(id, status);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "บันทึกแล้ว");
      router.refresh();
    });
  }

  function start(id: number) {
    startTransition(async () => {
      const res = await startTrainingAction(id);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "เริ่มจับเวลาแล้ว");
      router.refresh();
    });
  }

  function cancelStart(id: number) {
    startTransition(async () => {
      const res = await cancelTrainingStartAction(id);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "ยกเลิกแล้ว");
      router.refresh();
    });
  }

  function confirmStop(id: number) {
    startTransition(async () => {
      const res = await stopTrainingAction(id, note);
      if (res.error) {
        toast.error(res.error);
        return; // เปิดกล่องกรอกเหตุผลค้างไว้ ให้กรอกแล้วลองใหม่
      }
      toast.success(res.success ?? "จบเทรนแล้ว");
      setStoppingId(null);
      setNote("");
      router.refresh();
    });
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground p-5">ยังไม่มีนัดเทรน</p>;
  }

  return (
    <div className="divide-y divide-border">
      {bookings.map((b) => {
        const inProgress = b.status === "BOOKED" && !!b.sessionStartedAt;
        return (
          <div key={b.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">{b.dateLabel}</span>
                <span className="text-muted-foreground"> · {b.timeLabel}</span>
              </div>

              {readOnly ? (
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md",
                    b.status === "COMPLETED"
                      ? "bg-primary/10 text-primary"
                      : b.status === "NO_SHOW"
                        ? "bg-destructive/10 text-destructive"
                        : "text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[b.status]}
                </span>
              ) : !b.isPast ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> รอถึงเวลา
                </span>
              ) : inProgress ? (
                <div className="flex items-center gap-2">
                  <LiveTimer startedAt={b.sessionStartedAt!} />
                  <button
                    disabled={pending}
                    onClick={() => {
                      setStoppingId(b.id);
                      setNote("");
                    }}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-destructive text-destructive-foreground disabled:opacity-50"
                  >
                    <Square className="size-3.5" /> จบเทรน
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => cancelStart(b.id)}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : b.status === "BOOKED" ? (
                <div className="flex items-center gap-1.5">
                  {b.isToday && (
                    <button
                      disabled={pending}
                      onClick={() => start(b.id)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      <Play className="size-3.5" /> เริ่มเทรน
                    </button>
                  )}
                  <button
                    disabled={pending}
                    onClick={() => mark(b.id, "NO_SHOW")}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-muted disabled:opacity-50"
                  >
                    <X className="size-3.5" /> ขาด
                  </button>
                </div>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md",
                    b.status === "COMPLETED"
                      ? "bg-primary text-primary-foreground"
                      : "bg-destructive text-destructive-foreground",
                  )}
                >
                  {b.status === "COMPLETED" ? (
                    <Check className="size-3.5" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                  {STATUS_LABEL[b.status]}
                </span>
              )}
            </div>

            {/* ทางเลือก: บันทึกว่ามาเทรนโดยไม่จับเวลา (เช่น ลืมกดเริ่มตอนนั้น) */}
            {!readOnly && b.isPast && !inProgress && b.status === "BOOKED" && (
              <button
                disabled={pending}
                onClick={() => mark(b.id, "COMPLETED")}
                className="mt-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50"
              >
                หรือบันทึกว่ามาเทรนแล้วโดยไม่จับเวลา
              </button>
            )}

            {/* เวลาที่ใช้จริง + เหตุผล (ถ้ามี) — จากการจับเวลา */}
            {b.status === "COMPLETED" && b.durationMinutes != null && (
              <div className="mt-1.5 text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Timer className="size-3.5" />
                  ใช้เวลาเทรน {b.durationMinutes} นาที
                </span>
                {b.durationNote && (
                  <span className="italic">เหตุผล: “{b.durationNote}”</span>
                )}
              </div>
            )}

            {/* กล่องยืนยันจบเทรน + เหตุผล */}
            {!readOnly && stoppingId === b.id && (
              <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 space-y-2">
                <label className="text-xs text-muted-foreground block">
                  เหตุผล (บังคับกรอกถ้าเวลาที่ใช้ไม่ตรง 1 ชั่วโมงตามกำหนด)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="เช่น ลูกเทรนมาสาย / เทรนต่อเพิ่มเพราะ..."
                    className="mt-1 w-full min-h-16 px-2.5 py-2 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    disabled={pending}
                    onClick={() => confirmStop(b.id)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="size-3.5" /> ยืนยันจบเทรน
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => setStoppingId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
