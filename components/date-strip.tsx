import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateStripDay = {
  dateStr: string;
  dayShort: string;
  dayNum: string;
  hasEntries: boolean;
};

export function DateStrip({
  basePath,
  days,
  selectedDateStr,
  prevDateStr,
  nextDateStr,
  showTitle = true,
}: {
  basePath: string;
  days: DateStripDay[];
  selectedDateStr: string;
  prevDateStr: string;
  nextDateStr: string;
  showTitle?: boolean;
}) {
  return (
    <div className={showTitle ? "mb-6" : "mb-4"}>
      {showTitle ? (
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold tracking-tight">ไดอารี่</h1>
          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-border bg-card text-muted-foreground">
            {format(new Date(`${selectedDateStr}T00:00:00`), "d MMM yyyy")}
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground mb-2">
          {format(new Date(`${selectedDateStr}T00:00:00`), "d MMM yyyy")}
        </div>
      )}

      <div className="flex items-center gap-1">
        <Link
          href={`${basePath}?date=${prevDateStr}`}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground shrink-0"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div className="flex-1 grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const active = d.dateStr === selectedDateStr;
            return (
              <Link
                key={d.dateStr}
                href={`${basePath}?date=${d.dateStr}`}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 rounded-[var(--radius-md)] border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card border-border hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "text-[11px]",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {d.dayShort}
                </span>
                <span className="text-sm font-semibold">{d.dayNum}</span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    d.hasEntries
                      ? active
                        ? "bg-primary-foreground"
                        : "bg-primary"
                      : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
        </div>
        <Link
          href={`${basePath}?date=${nextDateStr}`}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground shrink-0"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
