"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Flame,
  Trophy,
  Star,
  Footprints,
  Dumbbell,
  Crown,
  Camera,
  UtensilsCrossed,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { setLeaderboardOptInAction } from "@/app/_actions/gamification";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Footprints,
  Dumbbell,
  Trophy,
  Crown,
  Flame,
  Camera,
  UtensilsCrossed,
};

export type BadgeItem = {
  code: string;
  label: string;
  description: string;
  icon: string;
  earnedAt: string | null;
};

export type LeaderboardRow = {
  id: number;
  name: string;
  points: number;
  streak: number;
  isMe: boolean;
};

export function PointsPanel({
  totalPoints,
  currentStreak,
  longestStreak,
  leaderboardOptIn,
  badges,
  leaderboard,
}: {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  leaderboardOptIn: boolean;
  badges: BadgeItem[];
  leaderboard: LeaderboardRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optIn, setOptIn] = useState(leaderboardOptIn);

  function toggleOptIn() {
    const next = !optIn;
    setOptIn(next);
    startTransition(async () => {
      const res = await setLeaderboardOptInAction(next);
      if (res.error) {
        toast.error(res.error);
        setOptIn(!next);
        return;
      }
      toast.success(res.success ?? "บันทึกแล้ว");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* สถิติ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 text-center">
          <Star className="size-5 mx-auto text-primary mb-1.5" />
          <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">แต้มสะสม</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 text-center">
          <Flame
            className={cn(
              "size-5 mx-auto mb-1.5",
              currentStreak > 0 ? "text-destructive" : "text-muted-foreground",
            )}
          />
          <div className="text-2xl font-bold">{currentStreak}</div>
          <div className="text-xs text-muted-foreground">วันติดต่อกัน</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 text-center">
          <Trophy className="size-5 mx-auto text-amber-500 mb-1.5" />
          <div className="text-2xl font-bold">{longestStreak}</div>
          <div className="text-xs text-muted-foreground">สถิติต่อเนื่องสูงสุด</div>
        </div>
      </div>

      {/* Badge */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold mb-3">Badge ที่ปลดล็อกแล้ว</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {badges.map((b) => {
            const Icon = ICONS[b.icon] ?? Star;
            const earned = !!b.earnedAt;
            return (
              <div
                key={b.code}
                title={b.description}
                className={cn(
                  "rounded-[var(--radius-md)] border p-3 text-center transition-colors",
                  earned
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-muted/30 opacity-50",
                )}
              >
                <div className="relative inline-flex">
                  <Icon
                    className={cn(
                      "size-6 mx-auto mb-1.5",
                      earned ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  {!earned && (
                    <Lock className="size-3 absolute -right-1 -bottom-1 text-muted-foreground" />
                  )}
                </div>
                <div className="text-xs font-medium truncate">{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold">Leaderboard</h3>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            เปิดให้เพื่อนเห็นอันดับฉัน
            <button
              type="button"
              role="switch"
              aria-checked={optIn}
              disabled={pending}
              onClick={toggleOptIn}
              className={cn(
                "w-9 h-5 rounded-full relative transition-colors disabled:opacity-50",
                optIn ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
                  optIn ? "translate-x-4.5 left-0.5" : "translate-x-0 left-0.5",
                )}
              />
            </button>
          </label>
        </div>

        {!optIn && (
          <p className="text-xs text-muted-foreground mb-3">
            คุณยังไม่เปิด Leaderboard — เปิดเพื่อดูอันดับเทียบกับลูกเทรนคนอื่นของโค้ชเดียวกัน (แบบ opt-in ปิดเป็นค่าเริ่มต้น)
          </p>
        )}

        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            ยังไม่มีใครเปิด Leaderboard
          </p>
        ) : (
          <div className="divide-y divide-border">
            {leaderboard.map((row, i) => (
              <div
                key={row.id}
                className={cn(
                  "flex items-center gap-3 py-2.5",
                  row.isMe && "bg-primary/5 -mx-4 sm:-mx-5 px-4 sm:px-5 rounded-md",
                )}
              >
                <div
                  className={cn(
                    "w-6 shrink-0 text-center text-sm font-bold",
                    i === 0
                      ? "text-amber-500"
                      : i === 1
                        ? "text-slate-400"
                        : i === 2
                          ? "text-amber-700"
                          : "text-muted-foreground",
                  )}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 text-sm font-medium truncate">
                  {row.name}
                  {row.isMe && <span className="text-primary font-normal"> (คุณ)</span>}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Flame className="size-3.5" />
                  {row.streak}
                </div>
                <div className="text-sm font-semibold shrink-0 w-14 text-right">
                  {row.points.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
