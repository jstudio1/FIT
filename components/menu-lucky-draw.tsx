"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Dices,
  Sparkles,
  Leaf,
  Flame,
  Cookie,
  UtensilsCrossed,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItemDTO } from "@/lib/menu";

const RADIUS = 128; // px รัศมีวงกลม
const ITEM_SIZE = 68; // px ขนาดวงกลมแต่ละเมนู
const SPIN_MS = 4200; // ระยะเวลาที่วงล้อหมุน (ต้องตรงกับ transition duration ด้านล่าง)
const REVOLUTIONS = 6; // จำนวนรอบที่หมุนก่อนหยุด

const CONFETTI_COLORS = ["bg-primary", "bg-amber-400", "bg-rose-400", "bg-sky-400", "bg-emerald-400"];
const CONFETTI_EMOJI = ["🎉", "✨", "⭐", "🍀"];

type ConfettiPiece =
  | { id: number; kind: "dot"; dx: number; dy: number; rot: number; color: string; delay: number }
  | { id: number; kind: "emoji"; dx: number; dy: number; rot: number; emoji: string; delay: number };

function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: 32 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 120;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const rot = (Math.random() - 0.5) * 720;
    const delay = Math.random() * 0.12;
    if (i % 4 === 0) {
      return {
        id: i,
        kind: "emoji" as const,
        dx,
        dy,
        rot,
        emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
        delay,
      };
    }
    return {
      id: i,
      kind: "dot" as const,
      dx,
      dy,
      rot,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay,
    };
  });
}

export function MenuLuckyDraw({ initialMenus }: { initialMenus: MenuItemDTO[] }) {
  const [menus] = useState(initialMenus);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [flash, setFlash] = useState(false);
  const [charging, setCharging] = useState(false);
  const pendingWinnerRef = useRef<number | null>(null);

  const positions = menus.map((_, i) => {
    const angle = (360 / menus.length) * i - 90;
    const rad = (angle * Math.PI) / 180;
    return { x: Math.cos(rad) * RADIUS, y: Math.sin(rad) * RADIUS };
  });

  const winner = winnerIndex != null ? menus[winnerIndex] : null;

  function draw() {
    if (spinning || menus.length === 0) return;
    setWinnerIndex(null);
    setConfetti([]);
    setFlash(false);
    setCharging(true);
    setTimeout(() => setCharging(false), 400);

    const targetIndex = Math.floor(Math.random() * menus.length);
    const anglePerItem = 360 / menus.length;
    const itemBaseAngle = anglePerItem * targetIndex - 90;

    // หมุนให้เมนูที่สุ่มได้ไปหยุดอยู่ใต้ลูกศรชี้ (มุม -90 หรือ 12 นาฬิกา) พอดี
    const currentMod = ((rotation % 360) + 360) % 360;
    let targetMod = (-90 - itemBaseAngle) % 360;
    if (targetMod < 0) targetMod += 360;
    const deltaToTarget = (targetMod - currentMod + 360) % 360;
    const newRotation = rotation + REVOLUTIONS * 360 + deltaToTarget;

    pendingWinnerRef.current = targetIndex;
    setSpinning(true);
    setRotation(newRotation);
    // กันเหนียว: ถ้า transitionend ไม่ยิง (เช่น แท็บไม่ได้โฟกัส/ถูก throttle) ให้เปิดผลลัพธ์เองหลังครบเวลาสปิน
    setTimeout(() => {
      setSpinning((stillSpinning) => {
        if (!stillSpinning) return stillSpinning;
        revealWinner();
        return false;
      });
    }, SPIN_MS + 250);
  }

  function revealWinner() {
    setWinnerIndex(pendingWinnerRef.current);
    setConfetti(makeConfetti());
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
  }

  function handleWheelTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    // transitionend เป็น bubbling event — เมนูแต่ละอันข้างในก็มี transition ของตัวเองด้วย
    // เช็ค target === currentTarget กันไม่ให้ event จากลูกลอยขึ้นมาสั่งซ้ำ
    if (e.target !== e.currentTarget || e.propertyName !== "transform" || !spinning) return;
    setSpinning(false);
    revealWinner();
  }

  if (menus.length === 0) {
    return (
      <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
        <Dices className="size-8 mx-auto mb-2" />
        ยังไม่มีเมนูให้เสี่ยงโชคตอนนี้
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="relative mx-auto flex items-center justify-center"
        style={{ width: RADIUS * 2 + ITEM_SIZE + 20, height: RADIUS * 2 + ITEM_SIZE + 20 }}
      >
        {/* บลอบพื้นหลังเบาๆ ให้ดูมีมิติ */}
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl pointer-events-none" />

        {/* กรอบเรืองแสงลอยรอบวงล้อตอนกำลังหมุน */}
        {spinning && (
          <div
            className="absolute rounded-full animate-lucky-glow-pulse pointer-events-none"
            style={{ width: RADIUS * 2 + ITEM_SIZE, height: RADIUS * 2 + ITEM_SIZE }}
          />
        )}

        {/* ลูกศรชี้ตำแหน่งที่จะหยุด (คงที่ ไม่หมุนตาม) */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 z-40 drop-shadow">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderTop: "14px solid var(--primary)",
            }}
          />
        </div>

        {/* วงล้อที่หมุนจริง — ครอบทุกเมนูไว้แล้วหมุนไปด้วยกัน */}
        <div
          onTransitionEnd={handleWheelTransitionEnd}
          className="absolute inset-0"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.11, 0.6, 0.12, 1)` : undefined,
          }}
        >
          {menus.map((m, i) => {
            const pos = positions[i];
            const isWinner = !spinning && winnerIndex === i;
            return (
              <div
                key={m.id}
                className={cn(
                  "absolute rounded-full overflow-hidden border-2 bg-muted flex items-center justify-center shadow-sm",
                  isWinner ? "border-primary ring-4 ring-primary/50 z-20" : "border-border",
                )}
                style={{
                  width: ITEM_SIZE,
                  height: ITEM_SIZE,
                  left: `calc(50% + ${pos.x}px - ${ITEM_SIZE / 2}px)`,
                  top: `calc(50% + ${pos.y}px - ${ITEM_SIZE / 2}px)`,
                  transform: `rotate(${-rotation}deg) ${isWinner ? "scale(1.25)" : "scale(1)"}`,
                  transition: spinning
                    ? `transform ${SPIN_MS}ms cubic-bezier(0.11, 0.6, 0.12, 1)`
                    : "transform 0.3s ease",
                }}
                title={m.name}
              >
                {m.hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/menu/${m.id}`} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <UtensilsCrossed className="size-5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* แสงพุ่งตอนเปิดผล */}
        {flash && (
          <div className="absolute inset-6 rounded-full bg-white animate-lucky-flash pointer-events-none" />
        )}
        {winner && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="size-16 rounded-full bg-primary/60 animate-lucky-glow" />
          </div>
        )}

        {/* คอนเฟตติ้ */}
        {confetti.map((c) =>
          c.kind === "emoji" ? (
            <span
              key={c.id}
              className="absolute text-lg animate-lucky-confetti pointer-events-none"
              style={
                {
                  left: "50%",
                  top: "50%",
                  "--dx": `${c.dx}px`,
                  "--dy": `${c.dy}px`,
                  "--rot": `${c.rot}deg`,
                  animationDelay: `${c.delay}s`,
                } as React.CSSProperties
              }
            >
              {c.emoji}
            </span>
          ) : (
            <span
              key={c.id}
              className={cn(
                "absolute size-2 rounded-full animate-lucky-confetti pointer-events-none",
                c.color,
              )}
              style={
                {
                  left: "50%",
                  top: "50%",
                  "--dx": `${c.dx}px`,
                  "--dy": `${c.dy}px`,
                  "--rot": `${c.rot}deg`,
                  animationDelay: `${c.delay}s`,
                } as React.CSSProperties
              }
            />
          ),
        )}

        {/* ปุ่มเสี่ยงโชคตรงกลาง */}
        <button
          type="button"
          onClick={draw}
          disabled={spinning}
          className={cn(
            "relative z-30 h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 disabled:opacity-90",
            charging && "animate-lucky-charge",
          )}
        >
          <Dices className={cn("size-6", spinning && "animate-spin")} />
          <span className="text-xs font-semibold">{spinning ? "กำลังสุ่ม..." : "เสี่ยงโชค!"}</span>
        </button>
      </div>

      {winner && (
        <div className="animate-lucky-reveal max-w-sm mx-auto rounded-[var(--radius-lg)] border border-primary/30 bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-4 py-2">
            <Sparkles className="size-3.5" />
            ผลการเสี่ยงโชค
          </div>
          <div className="flex gap-3 p-4">
            <div className="h-20 w-20 shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-muted">
              {winner.hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/menu/${winner.id}`} alt={winner.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <UtensilsCrossed className="size-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold leading-snug">{winner.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{winner.calories} kcal</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {winner.tagClean && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Leaf className="size-2.5" /> คลีน
                  </span>
                )}
                {winner.tagLowCal && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Flame className="size-2.5" /> แคลน้อย
                  </span>
                )}
                {winner.tagDessert && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                    <Cookie className="size-2.5" /> ขนม
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <Link
              href={`/client/menu/${winner.id}`}
              className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              ดูรายละเอียดเมนู
              <ArrowRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={draw}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="size-3.5" />
              เสี่ยงโชคอีกครั้ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
