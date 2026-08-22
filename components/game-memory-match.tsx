"use client";

import { useEffect, useRef, useState } from "react";
import { Grid3x3, RotateCcw, Trophy, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItemDTO } from "@/lib/menu";

const BEST_KEY = "fitgame_memory_best_moves";

type Card = { key: string; menuId: number; menu: MenuItemDTO };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(menus: MenuItemDTO[]): Card[] {
  const pairs = menus.flatMap((m, i) => [
    { key: `${m.id}-a-${i}`, menuId: m.id, menu: m },
    { key: `${m.id}-b-${i}`, menuId: m.id, menu: m },
  ]);
  return shuffle(pairs);
}

export function GameMemoryMatch({ menus }: { menus: MenuItemDTO[] }) {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(menus));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(BEST_KEY);
    if (stored) setBest(Number(stored));
  }, []);

  const finished = deck.length > 0 && matched.size === deck.length;

  useEffect(() => {
    if (startedAt == null || finished) return;
    const startedAtMs = startedAt;
    function loop() {
      setElapsedMs(Date.now() - startedAtMs);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startedAt, finished]);

  useEffect(() => {
    if (!finished) return;
    if (best == null || moves < best) {
      setBest(moves);
      localStorage.setItem(BEST_KEY, String(moves));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function reset() {
    setDeck(buildDeck(menus));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setBusy(false);
    setStartedAt(null);
    setElapsedMs(0);
  }

  function flipCard(index: number) {
    if (busy || finished) return;
    if (flipped.includes(index) || matched.has(index)) return;
    if (startedAt == null) setStartedAt(Date.now());

    const next = [...flipped, index];
    setFlipped(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].menuId === deck[b].menuId) {
        setMatched((prev) => new Set(prev).add(a).add(b));
        setFlipped([]);
      } else {
        setBusy(true);
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, 750);
      }
    }
  }

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-center">
        <h3 className="font-semibold flex items-center justify-center gap-1.5">
          <Grid3x3 className="size-4.5 text-primary" />
          จับคู่เมนู
        </h3>
        <p className="text-xs text-muted-foreground mt-1">พลิกการ์ดหาเมนูที่เหมือนกัน</p>
      </div>

      <div className="flex items-center justify-center gap-4 text-sm">
        <span className="text-muted-foreground">
          จับคู่ <span className="font-semibold text-foreground">{moves}</span> ครั้ง
        </span>
        <span className="text-muted-foreground">
          เวลา <span className="font-semibold text-foreground tabular-nums">{seconds}</span> วิ
        </span>
      </div>

      {finished ? (
        <div className="animate-lucky-reveal text-center space-y-3 py-6">
          <div className="text-3xl">🎉</div>
          <p className="font-semibold">จับคู่ครบแล้ว!</p>
          <p className="text-sm text-muted-foreground">
            ใช้ {moves} ครั้ง · {seconds} วินาที
          </p>
          {best != null && (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Trophy className="size-3.5 text-amber-500" />
              {moves === best ? "สถิติใหม่! (น้อยครั้งที่สุด)" : `สถิติน้อยที่สุด: ${best} ครั้ง`}
            </p>
          )}
          <div>
            <button
              type="button"
              onClick={reset}
              className="h-10 px-5 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="size-4" />
              เล่นอีกครั้ง
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {deck.map((card, i) => {
              const isFlipped = flipped.includes(i) || matched.has(i);
              const isMatched = matched.has(i);
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => flipCard(i)}
                  className={cn(
                    "game-card-flip aspect-square",
                    isMatched && "animate-game-matched",
                  )}
                >
                  <div className={cn("game-card-flip-inner", isFlipped && "is-flipped")}>
                    <div className="game-card-face rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center border border-primary/40">
                      <UtensilsCrossed className="size-5 text-primary-foreground/80" />
                    </div>
                    <div
                      className={cn(
                        "game-card-face game-card-face-back rounded-[var(--radius-md)] overflow-hidden border-2",
                        isMatched ? "border-primary" : "border-border",
                      )}
                    >
                      {card.menu.hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/menu/${card.menu.id}`}
                          alt={card.menu.name}
                          className="h-full w-full object-cover bg-muted"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                          <UtensilsCrossed className="size-5" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {best != null && (
            <p className="text-center text-xs text-muted-foreground inline-flex items-center gap-1 justify-center w-full">
              <Trophy className="size-3.5 text-amber-500" />
              สถิติน้อยที่สุด: {best} ครั้ง
            </p>
          )}
        </>
      )}
    </div>
  );
}
