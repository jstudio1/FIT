"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

export type LiveSessionRow = {
  bookingId: number;
  trainerName: string;
  clientId: number;
  clientName: string;
  clientNickname: string | null;
  clientAvatarPath: string | null;
  sessionStartedAt: string; // ISO
};

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function useNow(intervalMs = 1000): number | null {
  // เริ่มที่ null เสมอ (ทั้งฝั่ง server และ client ตอน render ครั้งแรกก่อน hydrate)
  // แล้วค่อยตั้งเวลาจริงใน useEffect — กัน hydration mismatch จาก Date.now() ที่ไม่เท่ากันระหว่าง server/client
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function OwnerLiveSessions({ sessions }: { sessions: LiveSessionRow[] }) {
  const now = useNow();

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center gap-2 mb-4">
        <span className="relative flex size-2.5">
          {sessions.length > 0 && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          )}
          <span
            className={`relative inline-flex size-2.5 rounded-full ${sessions.length > 0 ? "bg-primary" : "bg-muted-foreground/40"}`}
          />
        </span>
        <h3 className="font-semibold">กำลังเทรนอยู่ตอนนี้</h3>
        <span className="text-xs text-muted-foreground">({sessions.length} คู่)</span>
      </div>

      {sessions.length === 0 ? (
        <p className="relative text-sm text-muted-foreground py-2">
          ไม่มีใครกำลังเทรนอยู่ตอนนี้
        </p>
      ) : (
        <div className="relative grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s, i) => {
            const elapsed =
              now == null
                ? null
                : Math.max(0, Math.floor((now - new Date(s.sessionStartedAt).getTime()) / 1000));
            return (
              <Link
                key={s.bookingId}
                href={`/owner/clients/${s.clientId}`}
                style={{ "--stagger": i } as React.CSSProperties}
                className="animate-fade-up hover-lift flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-card/80 backdrop-blur-sm p-3"
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold overflow-hidden">
                  {s.clientAvatarPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/avatar/${s.clientId}`}
                      alt={s.clientName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    s.clientName.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {s.clientName}
                    {s.clientNickname && (
                      <span className="text-muted-foreground font-normal"> ({s.clientNickname})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    เทรนเนอร์ {s.trainerName}
                  </div>
                </div>
                <div className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary tabular-nums">
                  <Zap className="size-3" />
                  {elapsed == null ? "--:--" : formatElapsed(elapsed)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
