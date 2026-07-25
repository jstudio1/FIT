import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-3.5 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm text-muted-foreground">
          {label}
        </span>
        <div className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
          <Icon className="size-3.5 sm:size-4.5" />
        </div>
      </div>
      <div className="mt-2 sm:mt-3 text-xl sm:text-3xl font-bold tracking-tight">
        {value}
      </div>
      {hint && (
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
