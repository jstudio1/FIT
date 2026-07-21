import { cn } from "@/lib/utils";

export type ResultLogRow = {
  id: number;
  dateLabel: string;
  phase: "PRE" | "POST";
  weight: number | null;
  waist: number | null;
  muscleMass: number | null;
  bodyFat: number | null;
  note: string | null;
};

/** ตารางบันทึกผลลัพธ์รายวัน แบบอ่านอย่างเดียว (สำหรับเทรนเนอร์ดูของลูกเทรนแต่ละคน) */
export function ResultsLog({ rows }: { rows: ResultLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="p-5 text-sm text-muted-foreground">
        ลูกเทรนยังไม่ได้บันทึกผลลัพธ์
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left font-medium px-5 py-2.5">วันที่</th>
            <th className="text-left font-medium px-4 py-2.5">ช่วง</th>
            <th className="text-right font-medium px-4 py-2.5">น้ำหนัก</th>
            <th className="text-right font-medium px-4 py-2.5">รอบเอว</th>
            <th className="text-right font-medium px-4 py-2.5">กล้าม</th>
            <th className="text-right font-medium px-4 py-2.5">ไขมัน</th>
            <th className="text-left font-medium px-4 py-2.5">บันทึก</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-5 py-2.5 whitespace-nowrap font-medium">
                {r.dateLabel}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                    r.phase === "POST"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {r.phase === "POST" ? "หลังเทรน" : "ก่อนเทรน"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">{r.weight ?? "—"}</td>
              <td className="px-4 py-2.5 text-right">{r.waist ?? "—"}</td>
              <td className="px-4 py-2.5 text-right">{r.muscleMass ?? "—"}</td>
              <td className="px-4 py-2.5 text-right">{r.bodyFat ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground max-w-[220px] truncate">
                {r.note ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
