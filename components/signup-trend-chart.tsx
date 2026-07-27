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

export type SignupPoint = {
  date: string; // label เช่น 15/7
  clients: number;
  trainers: number;
};

export function SignupTrendChart({ data }: { data: SignupPoint[] }) {
  if (data.every((d) => d.clients === 0 && d.trainers === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-[var(--radius-md)]">
        ยังไม่มีการสมัครสมาชิกในช่วง 30 วันนี้
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={2} />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="clients"
            name="ลูกเทรน"
            stroke="#0d9488"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="trainers"
            name="เทรนเนอร์"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
