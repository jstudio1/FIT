"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import {
  addResultAction,
  deleteResultAction,
  type ResultInput,
} from "@/app/_actions/results";
import { ResultsChart, type ResultPoint } from "@/components/results-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ResultRow = {
  id: number;
  dateLabel: string;
  dateChart: string;
  weight: number | null;
  waist: number | null;
  muscleMass: number | null;
  bodyFat: number | null;
  phase: "PRE" | "POST";
  note: string | null;
};

const num = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const emptyForm = {
  measuredAt: new Date().toISOString().slice(0, 10),
  phase: "POST" as "PRE" | "POST",
  weight: "",
  waist: "",
  muscleMass: "",
  bodyFat: "",
  note: "",
};

export function ClientResults({ results }: { results: ResultRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const chartData: ResultPoint[] = results.map((r) => ({
    date: r.dateChart,
    weight: r.weight,
    waist: r.waist,
    muscleMass: r.muscleMass,
    bodyFat: r.bodyFat,
  }));

  function submit() {
    const input: ResultInput = {
      measuredAt: form.measuredAt,
      phase: form.phase,
      weight: num(form.weight),
      waist: num(form.waist),
      muscleMass: num(form.muscleMass),
      bodyFat: num(form.bodyFat),
      note: form.note.trim() || null,
    };
    startTransition(async () => {
      const res = await addResultAction(input);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "บันทึกแล้ว");
      setForm(emptyForm);
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: number) {
    if (!confirm("ลบผลลัพธ์รายการนี้?")) return;
    startTransition(async () => {
      const res = await deleteResultAction(id);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "ลบแล้ว");
      router.refresh();
    });
  }

  const history = [...results].reverse();

  return (
    <div className="space-y-5">
      {/* chart */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
        <h3 className="font-semibold mb-4">กราฟแนวโน้มผลลัพธ์</h3>
        <ResultsChart data={chartData} />
      </div>

      {/* add form */}
      {open ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <h3 className="font-semibold mb-4">บันทึกผลลัพธ์ใหม่</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>วันที่วัด</Label>
              <Input
                type="date"
                value={form.measuredAt}
                onChange={(e) =>
                  setForm({ ...form, measuredAt: e.target.value })
                }
              />
            </div>
            <div>
              <Label>ช่วงที่วัด</Label>
              <select
                value={form.phase}
                onChange={(e) =>
                  setForm({ ...form, phase: e.target.value as "PRE" | "POST" })
                }
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="PRE">ก่อนเทรน</option>
                <option value="POST">หลังเทรน</option>
              </select>
            </div>
            <div />
            <div>
              <Label>น้ำหนัก (กก.)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div>
              <Label>รอบเอว (ซม.)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.waist}
                onChange={(e) => setForm({ ...form, waist: e.target.value })}
              />
            </div>
            <div>
              <Label>มวลกล้ามเนื้อ (กก.)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.muscleMass}
                onChange={(e) =>
                  setForm({ ...form, muscleMass: e.target.value })
                }
              />
            </div>
            <div>
              <Label>ไขมัน (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.bodyFat}
                onChange={(e) => setForm({ ...form, bodyFat: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>บันทึกเพิ่มเติม</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="เช่น รู้สึกแข็งแรงขึ้น"
                className="min-h-10"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={submit} disabled={pending}>
              <Save className="size-4" />
              {pending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          บันทึกผลลัพธ์
        </Button>
      )}

      {/* history */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border font-semibold">
          ประวัติผลลัพธ์
        </div>
        {history.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium px-4 py-2">วันที่</th>
                  <th className="text-left font-medium px-4 py-2">ช่วง</th>
                  <th className="text-right font-medium px-4 py-2">น้ำหนัก</th>
                  <th className="text-right font-medium px-4 py-2">รอบเอว</th>
                  <th className="text-right font-medium px-4 py-2">กล้าม</th>
                  <th className="text-right font-medium px-4 py-2">ไขมัน</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.dateLabel}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
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
                    <td className="px-4 py-2.5 text-right">
                      {r.muscleMass ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.bodyFat ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => remove(r.id)}
                        disabled={pending}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                        title="ลบ"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
