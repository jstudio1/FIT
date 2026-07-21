"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ReportBucket } from "@/lib/reports";

export function ReportChart({ data }: { data: ReportBucket[] }) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-[var(--radius-md)]">
        ไม่มีข้อมูลในช่วงที่เลือก
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="completed" name="สำเร็จ" fill="#0d9488" radius={[4, 4, 0, 0]} />
          <Bar dataKey="noShow" name="ขาด" fill="#dc2626" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cancelled" name="ยกเลิก" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
