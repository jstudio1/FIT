"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointerClick, RotateCcw, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const DURATION_MS = 5000;
const BEST_KEY = "fitgame_tapspeed_best";

export function GameTapSpeed() {
  const [phase, setPhase] = useState<"idle" | "countdown" | "playing" | "finished">("idle");
  const [countdown, setCountdown] = useState(3);
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_MS);
  const [best, setBest] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const endTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(BEST_KEY);
    if (stored) setBest(Number(stored));
  }, []);

  function start() {
    setTaps(0);
    setCountdown(3);
    setPhase("countdown");
  }

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      setPhase("playing");
      endTimeRef.current = performance.now() + DURATION_MS;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "playing") return;
    function loop() {
      const remaining = Math.max(0, endTimeRef.current - performance.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setPhase("finished");
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // บันทึกสถิติตอนจบเกม
  useEffect(() => {
    if (phase !== "finished") return;
    if (best == null || taps > best) {
      setBest(taps);
      localStorage.setItem(BEST_KEY, String(taps));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function tap() {
    if (phase !== "playing") return;
    setTaps((t) => t + 1);
    setPulse(true);
    setTimeout(() => setPulse(false), 100);
  }

  const secondsLeft = Math.ceil(timeLeft / 1000);
  const tps = phase === "finished" ? (taps / (DURATION_MS / 1000)).toFixed(1) : null;

  return (
    <div className="max-w-md mx-auto text-center space-y-5">
      <div>
        <h3 className="font-semibold flex items-center justify-center gap-1.5">
          <Zap className="size-4.5 text-primary" />
          ทดสอบความเร็วมือ
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          แตะให้ได้มากที่สุดภายใน {DURATION_MS / 1000} วินาที
        </p>
      </div>

      {phase === "idle" && (
        <div className="py-8 flex flex-col items-center gap-5">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border",
              best != null
                ? "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400"
                : "bg-muted border-border text-muted-foreground",
            )}
          >
            <Trophy className="size-4" />
            {best != null ? `สถิติสูงสุดของคุณ: ${best} ครั้ง` : "ยังไม่มีสถิติ — ลองเล่นดูสิ!"}
          </div>
          <button
            type="button"
            onClick={start}
            className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:opacity-90 hover:scale-[1.03] active:scale-95 transition-all"
          >
            เริ่มเล่น
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="py-10">
          <div key={countdown} className="animate-lucky-reveal text-6xl font-bold text-primary">
            {countdown === 0 ? "ไป!" : countdown}
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">เหลือเวลา {secondsLeft} วิ</div>
          <div className="text-5xl font-bold tabular-nums">{taps}</div>
          <button
            type="button"
            onClick={tap}
            className={cn(
              "h-32 w-32 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-90 select-none",
              pulse && "scale-105",
            )}
          >
            <MousePointerClick className="size-10" />
          </button>
        </div>
      )}

      {phase === "finished" && (
        <div className="animate-lucky-reveal space-y-3 py-4">
          <div className="text-5xl font-bold text-primary">{taps}</div>
          <p className="text-sm text-muted-foreground">ครั้ง ({tps} ครั้ง/วินาที)</p>
          {best != null && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400">
              <Trophy className="size-4" />
              {taps === best ? "สถิติใหม่! 🎉" : `สถิติสูงสุด: ${best} ครั้ง`}
            </div>
          )}
          <div className="pt-1">
            <button
              type="button"
              onClick={start}
              className="h-12 px-8 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:opacity-90 hover:scale-[1.03] active:scale-95 transition-all"
            >
              <RotateCcw className="size-4" />
              เล่นอีกครั้ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
