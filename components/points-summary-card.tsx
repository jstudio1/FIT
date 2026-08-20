import {
  Flame,
  Trophy,
  Star,
  Footprints,
  Dumbbell,
  Crown,
  Camera,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
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

export function PointsSummaryCard({
  totalPoints,
  currentStreak,
  earnedBadges,
}: {
  totalPoints: number;
  currentStreak: number;
  earnedBadges: { code: string; label: string; icon: string }[];
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="size-4.5 text-primary" />
        <h3 className="font-semibold">แต้มสะสม & Badge</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md bg-muted/50 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
            <Star className="size-4 text-primary" /> แต้มสะสม
          </span>
          <span className="text-sm font-semibold">{totalPoints.toLocaleString()}</span>
        </div>
        <div className="rounded-md bg-muted/50 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
            <Flame className="size-4 text-destructive" /> ต่อเนื่อง
          </span>
          <span className="text-sm font-semibold">{currentStreak} วัน</span>
        </div>
      </div>
      {earnedBadges.length === 0 ? (
        <p className="text-xs text-muted-foreground">ยังไม่ได้ Badge</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {earnedBadges.map((b) => {
            const Icon = ICONS[b.icon] ?? Star;
            return (
              <span
                key={b.code}
                title={b.label}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
              >
                <Icon className="size-3.5" />
                {b.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
