import type { DailyTotals } from "@/lib/nutrition";

const COLORS = {
  carb: "#0d9488", // teal — primary
  protein: "#3b82f6", // blue
  fat: "#f59e0b", // amber
};

export function FoodDiarySummary({ totals }: { totals: DailyTotals }) {
  const carbCal = totals.carbs * 4;
  const proteinCal = totals.protein * 4;
  const fatCal = totals.fat * 9;
  const macroCal = carbCal + proteinCal + fatCal;

  const gradient =
    macroCal > 0
      ? (() => {
          const p1 = (carbCal / macroCal) * 100;
          const p2 = p1 + (proteinCal / macroCal) * 100;
          return `conic-gradient(${COLORS.carb} 0% ${p1}%, ${COLORS.protein} ${p1}% ${p2}%, ${COLORS.fat} ${p2}% 100%)`;
        })()
      : "conic-gradient(var(--muted) 0% 100%)";

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
      <h3 className="font-semibold mb-4">สรุปโภชนาการวันนี้</h3>

      <div className="flex justify-center mb-5">
        <div
          className="relative h-44 w-44 rounded-full flex items-center justify-center"
          style={{ background: gradient }}
        >
          <div className="h-32 w-32 rounded-full bg-card flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">พลังงาน</span>
            <span className="text-3xl font-bold tabular-nums">
              {totals.calories}
            </span>
            <span className="text-xs text-muted-foreground">แคลอรี่</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[var(--radius-md)] bg-muted p-3 text-center">
          <div
            className="text-xs font-medium mb-0.5"
            style={{ color: COLORS.carb }}
          >
            คาร์บ
          </div>
          <div className="text-lg font-bold tabular-nums">
            {totals.carbs}
            <span className="text-xs font-normal text-muted-foreground"> ก.</span>
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-muted p-3 text-center">
          <div
            className="text-xs font-medium mb-0.5"
            style={{ color: COLORS.protein }}
          >
            โปรตีน
          </div>
          <div className="text-lg font-bold tabular-nums">
            {totals.protein}
            <span className="text-xs font-normal text-muted-foreground"> ก.</span>
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-muted p-3 text-center">
          <div
            className="text-xs font-medium mb-0.5"
            style={{ color: COLORS.fat }}
          >
            ไขมัน
          </div>
          <div className="text-lg font-bold tabular-nums">
            {totals.fat}
            <span className="text-xs font-normal text-muted-foreground"> ก.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
