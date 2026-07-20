"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type ResultPoint = {
  date: string; // label เช่น 15/7
  weight: number | null;
  waist: number | null;
  muscleMass: number | null;
  bodyFat: number | null;
};

const METRICS: {
  key: keyof Omit<ResultPoint, "date">;
  name: string;
  color: string;
}[] = [
  { key: "weight", name: "น้ำหนัก (กก.)", color: "#0d9488" },
  { key: "waist", name: "รอบเอว (ซม.)", color: "#f59e0b" },
  { key: "muscleMass", name: "มวลกล้าม (กก.)", color: "#3b82f6" },
  { key: "bodyFat", name: "ไขมัน (%)", color: "#ec4899" },
];

export function ResultsChart({ data }: { data: ResultPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-[var(--radius-md)]">
        ยังไม่มีข้อมูลผลลัพธ์
      </div>
    );
  }

  // แสดงเฉพาะเส้นที่มีข้อมูลอย่างน้อย 1 จุด
  const active = METRICS.filter((m) => data.some((d) => d[m.key] != null));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {active.map((m) => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.name}
              stroke={m.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
