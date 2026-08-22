"use client";

import { useState } from "react";
import { Target, Zap, Grid3x3, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameTimingBar } from "@/components/game-timing-bar";
import { GameTapSpeed } from "@/components/game-tap-speed";
import { GameMemoryMatch } from "@/components/game-memory-match";
import type { MenuItemDTO } from "@/lib/menu";

type GameKey = "timing" | "tapspeed" | "memory";

const GAMES: { key: GameKey; label: string; icon: LucideIcon }[] = [
  { key: "timing", label: "จับจังหวะ", icon: Target },
  { key: "tapspeed", label: "ทดสอบความเร็วมือ", icon: Zap },
  { key: "memory", label: "จับคู่เมนู", icon: Grid3x3 },
];

export function FitGamesPanel({ memoryMenus }: { memoryMenus: MenuItemDTO[] }) {
  const [game, setGame] = useState<GameKey>("timing");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {GAMES.map((g) => {
          const Icon = g.icon;
          const active = game === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setGame(g.key)}
              className={cn(
                "inline-flex items-center gap-1.5 pl-3.5 pr-4 py-2 rounded-full text-sm font-medium border transition-all",
                active
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-transparent shadow-md shadow-primary/25 scale-[1.03]"
                  : "border-border text-muted-foreground hover:bg-muted hover:scale-[1.02]",
              )}
            >
              <Icon className="size-4" />
              {g.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 sm:p-8">
        {game === "timing" && <GameTimingBar key="timing" />}
        {game === "tapspeed" && <GameTapSpeed key="tapspeed" />}
        {game === "memory" && <GameMemoryMatch key="memory" menus={memoryMenus} />}
      </div>
    </div>
  );
}
