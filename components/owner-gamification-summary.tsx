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
import { cn } from "@/lib/utils";
import type { GamificationProfile } from "@/lib/gamification";

const ICONS: Record<string, LucideIcon> = {
  Footprints,
  Dumbbell,
  Trophy,
  Crown,
  Flame,
  Camera,
  UtensilsCrossed,
};

/** สรุปแต้มสะสม/Streak/Badge ของลูกเทรน — อ่านอย่างเดียว สำหรับมุมมองเจ้าของระบบ */
export function OwnerGamificationSummary({ profile }: { profile: GamificationProfile }) {
  const earnedCount = profile.badges.filter((b) => b.earnedAt).length;

  return (
    <div className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_2fr]">
      <div className="rounded-[var(--radius-md)] bg-muted/50 p-3 text-center">
        <Star className="size-4.5 mx-auto text-primary mb-1" />
        <div className="text-xl font-bold">{profile.totalPoints.toLocaleString()}</div>
        <div className="text-[11px] text-muted-foreground">แต้มสะสม</div>
      </div>
      <div className="rounded-[var(--radius-md)] bg-muted/50 p-3 text-center">
        <Flame
          className={cn(
            "size-4.5 mx-auto mb-1",
            profile.currentStreak > 0 ? "text-destructive" : "text-muted-foreground",
          )}
        />
        <div className="text-xl font-bold">{profile.currentStreak}</div>
        <div className="text-[11px] text-muted-foreground">วันติดต่อกัน</div>
      </div>
      <div className="rounded-[var(--radius-md)] bg-muted/50 p-3 text-center">
        <Trophy className="size-4.5 mx-auto text-amber-500 mb-1" />
        <div className="text-xl font-bold">{profile.longestStreak}</div>
        <div className="text-[11px] text-muted-foreground">สถิติสูงสุด</div>
      </div>

      <div className="rounded-[var(--radius-md)] border border-border p-3 sm:col-span-1">
        <div className="text-[11px] text-muted-foreground mb-1.5">
          Badge ที่ปลดล็อกแล้ว ({earnedCount}/{profile.badges.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.badges.map((b) => {
            const Icon = ICONS[b.icon] ?? Star;
            const earned = !!b.earnedAt;
            return (
              <div
                key={b.code}
                title={`${b.label} — ${b.description}${earned ? "" : " (ยังไม่ปลดล็อก)"}`}
                className={cn(
                  "relative h-8 w-8 shrink-0 rounded-md border flex items-center justify-center",
                  earned ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30 opacity-50",
                )}
              >
                <Icon className={cn("size-4", earned ? "text-primary" : "text-muted-foreground")} />
                {!earned && (
                  <Lock className="size-2.5 absolute -right-0.5 -bottom-0.5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
