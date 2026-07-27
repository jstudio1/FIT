import type { DailyTotals } from "@/lib/nutrition";

const COLORS = {
  carb: "#0d9488", // teal — primary
  protein: "#3b82f6", // blue
  fat: "#f59e0b", // amber
};

export type NutritionTarget = {
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
};

function RemainingRow({
  label,
  color,
  consumed,
  target,
  unit,
}: {
  label: string;
  color: string;
  consumed: number;
  target: number | null;
  unit: string;
}) {
  if (target == null) return null;
  const remaining = target - consumed;
  const over = remaining < 0;
  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium" style={{ color }}>
          {label}
        </span>
        <span className={over ? "text-destructive font-medium" : "text-muted-foreground"}>
          {over
            ? `เกิน ${Math.abs(remaining)}${unit}`
            : `เหลือ ${remaining}${unit}`}
          <span className="text-muted-foreground"> ({consumed}/{target}{unit})</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: over ? "var(--destructive)" : color }}
        />
      </div>
    </div>
  );
}

export function FoodDiarySummary({
  totals,
  target,
}: {
  totals: DailyTotals;
  target?: NutritionTarget | null;
}) {
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

  const hasTarget =
    target &&
    (target.calories != null || target.carbs != null || target.protein != null || target.fat != null);

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
            <span className="text-xs text-muted-foreground">
              แคลอรี่{target?.calories != null && ` / ${target.calories}`}
            </span>
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

      {hasTarget && (
        <div className="mt-5 pt-4 border-t border-border space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground">
            คงเหลือที่รับได้วันนี้ (เป้าหมายจากเทรนเนอร์)
          </h4>
          <RemainingRow label="แคลอรี่" color="var(--primary)" consumed={totals.calories} target={target!.calories} unit=" แคล" />
          <RemainingRow label="คาร์บ" color={COLORS.carb} consumed={totals.carbs} target={target!.carbs} unit="ก." />
          <RemainingRow label="โปรตีน" color={COLORS.protein} consumed={totals.protein} target={target!.protein} unit="ก." />
          <RemainingRow label="ไขมัน" color={COLORS.fat} consumed={totals.fat} target={target!.fat} unit="ก." />
        </div>
      )}
    </div>
  );
}
