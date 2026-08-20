/** วงแหวนแสดง % แคลอรี่ที่กินไปแล้วเทียบกับเป้าหมายวันนี้ — เป็น server component ล้วน (SVG static, ไม่ต้องใช้ client JS) */
export function CalorieRing({
  consumed,
  target,
  size = 92,
}: {
  consumed: number;
  target: number;
  size?: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const overTarget = consumed > target;
  const strokeWidth = 9;
  const radius = 50 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size}>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={overTarget ? "var(--destructive)" : "var(--primary)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold tabular-nums leading-none">{pct}%</span>
        <span className="text-[9px] text-muted-foreground mt-0.5">ของเป้าหมาย</span>
      </div>
    </div>
  );
}
