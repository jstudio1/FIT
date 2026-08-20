"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Square, Timer, Check, Clock, PartyPopper } from "lucide-react";
import {
  startTrainingAction,
  stopTrainingAction,
  cancelTrainingStartAction,
} from "@/app/_actions/results";
import { cn } from "@/lib/utils";

export type SessionBooking = {
  id: number;
  timeLabel: string;
  status: "BOOKED" | "COMPLETED" | "NO_SHOW";
  clientId: number;
  clientName: string;
  nickname: string | null;
  avatarPath: string | null;
  isDue: boolean; // ถึงเวลาแล้ว ยังไม่เริ่ม
  isLive: boolean; // เริ่มจับเวลาอยู่ (ยังไม่จบ)
  sessionStartedAt: string | null; // ISO
  durationMinutes: number | null;
  durationNote: string | null;
};

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function useElapsedSeconds(startedAt: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}

function Avatar({
  name,
  avatarPath,
  clientId,
  size = "h-12 w-12",
}: {
  name: string;
  avatarPath: string | null;
  clientId: number;
  size?: string;
}) {
  return (
    <div
      className={cn(
        size,
        "shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold overflow-hidden",
      )}
    >
      {avatarPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/avatar/${clientId}`}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}

function LiveView({
  booking,
  pending,
  stopping,
  note,
  setNote,
  onStop,
  onCancelStart,
  onConfirmStop,
  onCancelStop,
  sessionDurationMin,
}: {
  booking: SessionBooking;
  pending: boolean;
  stopping: boolean;
  note: string;
  setNote: (v: string) => void;
  onStop: () => void;
  onCancelStart: () => void;
  onConfirmStop: () => void;
  onCancelStop: () => void;
  sessionDurationMin: number;
}) {
  const seconds = useElapsedSeconds(booking.sessionStartedAt!);
  const minutes = Math.floor(seconds / 60);
  const overtimeSec = seconds - sessionDurationMin * 60;
  const isOver = overtimeSec > 0;
  const started = new Date(booking.sessionStartedAt!);
  const startedLabel = `${String(started.getHours()).padStart(2, "0")}:${String(started.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5 flex items-center gap-3">
        <Avatar
          name={booking.clientName}
          avatarPath={booking.avatarPath}
          clientId={booking.clientId}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">
            {booking.clientName}
            {booking.nickname && (
              <span className="text-muted-foreground font-normal"> ({booking.nickname})</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">นัด {booking.timeLabel}</div>
        </div>
        <span
          className={cn(
            "text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap",
            isOver
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground animate-pulse",
          )}
        >
          {isOver ? "เกินเวลา" : "กำลังเทรน"}
        </span>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6 sm:p-8 text-center">
        <div
          className={cn(
            "text-5xl sm:text-6xl font-bold tabular-nums font-mono",
            isOver ? "text-destructive" : "text-primary",
          )}
        >
          {isOver ? `+${formatElapsed(overtimeSec)}` : formatElapsed(seconds)}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          เริ่ม {startedLabel} น. · กำหนด {sessionDurationMin} นาที
        </p>
        {isOver && (
          <div className="mt-4 rounded-md bg-destructive/10 text-destructive text-sm px-4 py-2.5">
            เลยเวลาที่กำหนดแล้ว — ต้องระบุเหตุผลตอนกดจบ Session
          </div>
        )}
      </div>

      {stopping ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5 space-y-3">
          <label className="text-sm font-medium block">
            เหตุผล{" "}
            {minutes !== sessionDurationMin && (
              <span className="text-destructive text-xs font-normal">
                (บังคับกรอก — ใช้เวลาไม่ตรง {sessionDurationMin} นาทีตามกำหนด)
              </span>
            )}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ลูกเทรนมาสาย / เทรนต่อเพิ่มเพราะ..."
              className="mt-1.5 w-full min-h-20 px-3 py-2 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={onConfirmStop}
              className="flex-1 h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50"
            >
              <Check className="size-4" /> ยืนยันจบ Session
            </button>
            <button
              disabled={pending}
              onClick={onCancelStop}
              className="px-4 h-11 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={onStop}
            className="flex-1 h-12 rounded-md bg-destructive text-destructive-foreground text-base font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            <Square className="size-5" /> จบ Session
          </button>
          <button
            disabled={pending}
            onClick={onCancelStart}
            className="px-4 h-12 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            ยกเลิกการเริ่ม
          </button>
        </div>
      )}
    </div>
  );
}

export function LiveSessionPanel({
  items,
  sessionDurationMin,
}: {
  items: SessionBooking[];
  sessionDurationMin: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const live = items.find((i) => i.isLive) ?? null;
  const due = items.filter((i) => i.isDue && !live);
  const upcoming = items.filter((i) => i.status === "BOOKED" && !i.isDue && !i.isLive);
  const finished = items.filter((i) => i.status !== "BOOKED");

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
        return; // เก็บกล่องกรอกเหตุผลไว้ให้แก้แล้วลองใหม่
      }
      toast.success(res.success ?? "จบ Session แล้ว");
      setStoppingId(null);
      setNote("");
      router.refresh();
    });
  }

  if (live) {
    return (
      <LiveView
        booking={live}
        pending={pending}
        stopping={stoppingId === live.id}
        note={note}
        setNote={setNote}
        onStop={() => {
          setStoppingId(live.id);
          setNote("");
        }}
        onCancelStart={() => cancelStart(live.id)}
        onConfirmStop={() => confirmStop(live.id)}
        onCancelStop={() => setStoppingId(null)}
        sessionDurationMin={sessionDurationMin}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
          ถึงเวลาเทรนแล้ว ({due.length})
        </h3>
        {due.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีลูกเทรนที่ถึงเวลา
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {due.map((b) => (
              <div
                key={b.id}
                className="rounded-[var(--radius-lg)] border border-primary/40 bg-primary/5 p-4 flex items-center gap-3"
              >
                <Avatar name={b.clientName} avatarPath={b.avatarPath} clientId={b.clientId} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {b.clientName}
                    {b.nickname && (
                      <span className="text-muted-foreground font-normal"> ({b.nickname})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{b.timeLabel}</div>
                </div>
                <button
                  disabled={pending}
                  onClick={() => start(b.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Play className="size-4" /> เริ่ม
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">รอถึงเวลา (วันนี้)</h3>
          <div className="rounded-[var(--radius-lg)] border border-border bg-card divide-y divide-border overflow-hidden">
            {upcoming.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar
                  name={b.clientName}
                  avatarPath={b.avatarPath}
                  clientId={b.clientId}
                  size="h-8 w-8"
                />
                <div className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{b.clientName}</span>
                  <span className="text-muted-foreground"> · {b.timeLabel}</span>
                </div>
                <Clock className="size-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {finished.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">เสร็จแล้ววันนี้</h3>
          <div className="rounded-[var(--radius-lg)] border border-border bg-card divide-y divide-border overflow-hidden">
            {finished.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar
                  name={b.clientName}
                  avatarPath={b.avatarPath}
                  clientId={b.clientId}
                  size="h-8 w-8"
                />
                <div className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{b.clientName}</span>
                  <span className="text-muted-foreground"> · {b.timeLabel}</span>
                  {b.durationMinutes != null && (
                    <span className="text-muted-foreground inline-flex items-center gap-1 ml-1.5">
                      <Timer className="size-3.5" />
                      {b.durationMinutes} นาที
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full shrink-0",
                    b.status === "COMPLETED"
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {b.status === "COMPLETED" ? "มาเทรน" : "ขาด"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {due.length === 0 && upcoming.length === 0 && finished.length === 0 && (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          <PartyPopper className="size-8 mx-auto mb-2" />
          วันนี้ไม่มีคิวเทรน
        </div>
      )}
    </div>
  );
}
