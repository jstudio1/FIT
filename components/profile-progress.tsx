import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { ProfileStep } from "@/lib/profile-progress";
import { cn } from "@/lib/utils";

export function ProfileProgress({
  steps,
  href,
  compact,
}: {
  steps: ProfileStep[];
  href: string;
  compact?: boolean;
}) {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done === total;

  if (compact) {
    return (
      <Link
        href={href}
        className="block rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-4 sm:p-5 hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm sm:text-base">
            ตั้งค่าโปรไฟล์
          </h3>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {done}/{total} ขั้นตอน
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              complete ? "bg-primary" : "bg-accent-foreground/60",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {complete
            ? "ตั้งค่าครบแล้ว 🎉"
            : `เหลืออีก ${total - done} ขั้นตอน — แตะเพื่อไปตั้งค่า`}
        </p>
      </Link>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">ความคืบหน้าโปรไฟล์</h3>
        <span className="text-sm text-muted-foreground">
          {done}/{total} ขั้นตอน
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            complete ? "bg-primary" : "bg-accent-foreground/60",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            {s.done ? (
              <CheckCircle2 className="size-4 text-primary shrink-0" />
            ) : (
              <Circle className="size-4 text-muted-foreground shrink-0" />
            )}
            <span className={s.done ? "" : "text-muted-foreground"}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
