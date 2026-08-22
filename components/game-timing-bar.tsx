"use client";

import { useEffect, useRef, useState } from "react";
import { Target, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUNDS = 5;
const ZONE_WIDTH = 16; // % ของความกว้างแถบ
const BASE_PERIOD_MS = 1500; // เวลาต่อรอบแกว่งไป-กลับ (รอบแรก)
const BEST_KEY = "fitgame_timing_best";

function randomZoneStart() {
  return 8 + Math.random() * (100 - ZONE_WIDTH - 16); // เว้นขอบไว้บ้าง
}

function rating(total: number): { label: string; color: string } {
  if (total >= ROUNDS * 85) return { label: "สุดยอด! 🔥", color: "text-primary" };
  if (total >= ROUNDS * 60) return { label: "เก่งมาก!", color: "text-amber-500" };
  if (total >= ROUNDS * 35) return { label: "พอใช้ได้", color: "text-muted-foreground" };
  return { label: "ลองอีกครั้งนะ", color: "text-muted-foreground" };
}

export function GameTimingBar() {
  const [phase, setPhase] = useState<"idle" | "playing" | "showScore" | "finished">("idle");
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [markerPos, setMarkerPos] = useState(50);
  const [zoneStart, setZoneStart] = useState(30);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [hit, setHit] = useState(false);
  const [best, setBest] = useState<number | null>(null);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem(BEST_KEY);
    if (stored) setBest(Number(stored));
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    startTimeRef.current = performance.now();
    const period = Math.max(750, BASE_PERIOD_MS - round * 130);

    function loop(now: number) {
      const elapsed = now - startTimeRef.current;
      const pos = 50 + 45 * Math.sin((elapsed / period) * 2 * Math.PI);
      setMarkerPos(pos);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, round]);

  function startGame() {
    setScores([]);
    setRound(0);
    setZoneStart(randomZoneStart());
    setPhase("playing");
  }

  function stopMarker() {
    if (phase !== "playing") return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const zoneCenter = zoneStart + ZONE_WIDTH / 2;
    const dist = Math.abs(markerPos - zoneCenter);
    const maxDist = ZONE_WIDTH / 2 + 18;
    const score = Math.max(0, Math.round(100 * (1 - dist / maxDist)));

    setLastScore(score);
    setHit(true);
    setTimeout(() => setHit(false), 300);
    setScores((prev) => [...prev, score]);
    setPhase("showScore");

    setTimeout(() => {
      if (round + 1 >= ROUNDS) {
        const total = [...scores, score].reduce((a, b) => a + b, 0);
        if (best == null || total > best) {
          setBest(total);
          localStorage.setItem(BEST_KEY, String(total));
        }
        setPhase("finished");
      } else {
        setRound((r) => r + 1);
        setZoneStart(randomZoneStart());
        setPhase("playing");
      }
    }, 750);
  }

  const total = scores.reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-md mx-auto text-center space-y-5">
      <div>
        <h3 className="font-semibold flex items-center justify-center gap-1.5">
          <Target className="size-4.5 text-primary" />
          จับจังหวะ
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          กดตอนเข็มอยู่ในโซนสีเขียวให้แม่นที่สุด — ทั้งหมด {ROUNDS} รอบ
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
            {best != null ? `คะแนนสูงสุดของคุณ: ${best}` : "ยังไม่มีสถิติ — ลองเล่นดูสิ!"}
          </div>
          <button
            type="button"
            onClick={startGame}
            className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:opacity-90 hover:scale-[1.03] active:scale-95 transition-all"
          >
            เริ่มเล่น
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "showScore") && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            รอบ {round + 1} / {ROUNDS}
          </div>
          <div className="relative h-3 rounded-full bg-muted mx-2">
            <div
              className="absolute inset-y-0 rounded-full bg-primary/25 border border-primary/40"
              style={{ left: `${zoneStart}%`, width: `${ZONE_WIDTH}%` }}
            />
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 size-5 rounded-full bg-primary shadow-md border-2 border-primary-foreground/50",
                hit && "animate-game-hit",
              )}
              style={{ left: `calc(${markerPos}% - 10px)` }}
            />
          </div>
          <button
            type="button"
            onClick={stopMarker}
            disabled={phase !== "playing"}
            className="h-14 w-14 mx-auto rounded-full bg-destructive text-destructive-foreground font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
          >
            หยุด!
          </button>
          {phase === "showScore" && lastScore != null && (
            <p className="text-sm font-semibold text-primary animate-fade-up">+{lastScore} คะแนน</p>
          )}
        </div>
      )}

      {phase === "finished" && (
        <div className="animate-lucky-reveal space-y-3 py-4">
          <div className="text-4xl font-bold text-primary">{total}</div>
          <p className={cn("text-sm font-medium", rating(total).color)}>{rating(total).label}</p>
          {best != null && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400">
              <Trophy className="size-4" />
              คะแนนสูงสุด: {best}
            </div>
          )}
          <div className="pt-1">
            <button
              type="button"
              onClick={startGame}
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
