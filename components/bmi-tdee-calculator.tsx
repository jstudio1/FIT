"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calculator, UserSearch, Save, Trash2, History, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  saveCalculatorResultAction,
  deleteCalculatorResultAction,
} from "@/app/_actions/calculator";

type Gender = "MALE" | "FEMALE";
type Goal = "cut" | "maintain" | "bulk";

export type CalculatorClientOption = {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  age: number | null;
};

export type SavedCalculatorResult = {
  id: number;
  dateLabel: string;
  clientName: string | null; // ชื่อลูกเทรน (แสดงเฉพาะฝั่งเทรนเนอร์ที่เลือกลูกเทรนไว้)
  goal: Goal;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
};

const GOAL_LABEL: Record<Goal, string> = {
  cut: "ลดไขมัน",
  maintain: "คงที่",
  bulk: "เพิ่มกล้าม",
};

// สัดส่วนแมคโคร (% ของแคลอรี่รวม) ต่อเป้าหมาย — โปรตีนสูงตอนลดไขมันเพื่อรักษามวลกล้ามเนื้อ
const MACRO_SPLIT: Record<Goal, { protein: number; carb: number; fat: number }> = {
  cut: { protein: 0.4, carb: 0.3, fat: 0.3 },
  maintain: { protein: 0.3, carb: 0.4, fat: 0.3 },
  bulk: { protein: 0.3, carb: 0.45, fat: 0.25 },
};

const ACTIVITY_LEVELS = [
  { value: "1.2", label: "แทบไม่ออกกำลังกาย (นั่งทำงานทั้งวัน)" },
  { value: "1.375", label: "ออกกำลังกายเบาๆ 1-3 วัน/สัปดาห์" },
  { value: "1.55", label: "ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์" },
  { value: "1.725", label: "ออกกำลังกายหนัก 6-7 วัน/สัปดาห์" },
  { value: "1.9", label: "ออกกำลังกายหนักมาก / ใช้แรงงานหนัก" },
];

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "น้ำหนักน้อย", color: "text-blue-600" };
  if (bmi < 23) return { label: "ปกติ", color: "text-primary" };
  if (bmi < 25) return { label: "ท้วม / เริ่มอ้วน", color: "text-amber-600" };
  if (bmi < 30) return { label: "อ้วน", color: "text-orange-600" };
  return { label: "อ้วนมาก", color: "text-destructive" };
}

export function BmiTdeeCalculator({
  clients,
  savedResults,
}: {
  clients?: CalculatorClientOption[];
  savedResults?: SavedCalculatorResult[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [gender, setGender] = useState<Gender>("MALE");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState(ACTIVITY_LEVELS[2].value);
  const [goal, setGoal] = useState<Goal>("maintain");
  const [selectedClientId, setSelectedClientId] = useState("");

  const applyClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients?.find((c) => String(c.id) === clientId);
    if (!client) return;
    if (client.height != null) setHeight(String(client.height));
    if (client.weight != null) setWeight(String(client.weight));
    if (client.age != null) setAge(String(client.age));
  };

  const result = useMemo(() => {
    const a = Number(age);
    const h = Number(height);
    const w = Number(weight);
    if (!a || !h || !w || a <= 0 || h <= 0 || w <= 0) return null;

    const bmi = w / (h / 100) ** 2;
    const bmr =
      gender === "MALE"
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;
    const tdee = bmr * Number(activity);

    return {
      bmi,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      cut: Math.round(tdee - 500),
      bulk: Math.round(tdee + 500),
    };
  }, [age, height, weight, gender, activity]);

  const calorieByGoal: Record<Goal, number> | null = result
    ? { cut: result.cut, maintain: result.tdee, bulk: result.bulk }
    : null;

  const macros = useMemo(() => {
    if (!calorieByGoal) return null;
    const calories = calorieByGoal[goal];
    const split = MACRO_SPLIT[goal];
    return {
      calories,
      protein: Math.round((calories * split.protein) / 4),
      carb: Math.round((calories * split.carb) / 4),
      fat: Math.round((calories * split.fat) / 9),
    };
  }, [calorieByGoal, goal]);

  function handleSave() {
    if (!result || !macros) return;
    startTransition(async () => {
      const res = await saveCalculatorResultAction({
        clientId: selectedClientId ? Number(selectedClientId) : null,
        gender,
        age: Number(age),
        height: Number(height),
        weight: Number(weight),
        activity: Number(activity),
        goal,
        bmi: result.bmi,
        bmr: result.bmr,
        tdee: result.tdee,
        calories: macros.calories,
        protein: macros.protein,
        carb: macros.carb,
        fat: macros.fat,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "บันทึกผลคำนวณแล้ว");
      router.refresh();
    });
  }

  function handleDelete(id: number) {
    if (!confirm("ลบผลคำนวณนี้?")) return;
    startTransition(async () => {
      const res = await deleteCalculatorResultAction(id);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "ลบแล้ว");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="size-5 text-primary" />
            <h3 className="font-semibold">คำนวณ BMI / TDEE</h3>
          </div>

          {clients && clients.length > 0 && (
            <label className="text-xs text-muted-foreground block mb-3">
              <span className="inline-flex items-center gap-1.5">
                <UserSearch className="size-3.5" />
                ดึงข้อมูลจากลูกเทรน (ไม่บังคับ)
              </span>
              <select
                value={selectedClientId}
                onChange={(e) => applyClient(e.target.value)}
                className="mt-1 h-10 w-full px-2.5 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">— เลือกลูกเทรน —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={() => setGender("MALE")}
              className={cn(
                "h-10 rounded-md border text-sm font-medium transition-colors",
                gender === "MALE"
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              ผู้ชาย
            </button>
            <button
              type="button"
              onClick={() => setGender("FEMALE")}
              className={cn(
                "h-10 rounded-md border text-sm font-medium transition-colors",
                gender === "FEMALE"
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              ผู้หญิง
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <label className="text-xs text-muted-foreground">
              อายุ (ปี)
              <input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1 h-10 w-full px-2.5 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                placeholder="25"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              ส่วนสูง (ซม.)
              <input
                type="number"
                inputMode="numeric"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="mt-1 h-10 w-full px-2.5 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                placeholder="170"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              น้ำหนัก (กก.)
              <input
                type="number"
                inputMode="numeric"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1 h-10 w-full px-2.5 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                placeholder="65"
              />
            </label>
          </div>

          <label className="text-xs text-muted-foreground block">
            ระดับกิจกรรม
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="mt-1 h-10 w-full px-2.5 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {ACTIVITY_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="size-5 text-primary" />
            <h3 className="font-semibold">ผลลัพธ์</h3>
          </div>

          {result ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-md bg-muted/50 p-3 flex sm:flex-col items-center justify-between sm:items-start gap-1">
                  <span className="text-sm sm:text-xs text-muted-foreground">BMI</span>
                  <span className="text-sm font-semibold">
                    {result.bmi.toFixed(1)}{" "}
                    <span className={bmiCategory(result.bmi).color}>
                      ({bmiCategory(result.bmi).label})
                    </span>
                  </span>
                </div>
                <div className="rounded-md bg-muted/50 p-3 flex sm:flex-col items-center justify-between sm:items-start gap-1">
                  <span className="text-sm sm:text-xs text-muted-foreground">BMR</span>
                  <span className="text-sm font-semibold">{result.bmr.toLocaleString()} kcal</span>
                </div>
                <div className="rounded-md bg-primary/10 p-3 flex sm:flex-col items-center justify-between sm:items-start gap-1">
                  <span className="text-sm sm:text-xs text-muted-foreground">TDEE</span>
                  <span className="text-sm font-semibold text-primary">
                    {result.tdee.toLocaleString()} kcal
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {(["cut", "maintain", "bulk"] as Goal[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={cn(
                      "rounded-md border p-2.5 text-center transition-colors",
                      goal === g
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <div className="text-[11px] text-muted-foreground mb-0.5">
                      {GOAL_LABEL[g]}
                    </div>
                    <div className="text-sm font-semibold">
                      {calorieByGoal![g].toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>

              {macros && (
                <div className="pt-1">
                  <div className="text-xs text-muted-foreground mb-1.5">
                    สัดส่วนแมคโครสำหรับเป้าหมาย &ldquo;{GOAL_LABEL[goal]}&rdquo; ({macros.calories.toLocaleString()} kcal)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md bg-muted/50 p-2.5 text-center">
                      <div className="text-[11px] text-muted-foreground mb-0.5">โปรตีน</div>
                      <div className="text-sm font-semibold">{macros.protein} g</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5 text-center">
                      <div className="text-[11px] text-muted-foreground mb-0.5">คาร์บ</div>
                      <div className="text-sm font-semibold">{macros.carb} g</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5 text-center">
                      <div className="text-[11px] text-muted-foreground mb-0.5">ไขมัน</div>
                      <div className="text-sm font-semibold">{macros.fat} g</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="size-4" />
                {pending ? "กำลังบันทึก..." : "บันทึกผล"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              กรอกข้อมูลด้านซ้ายให้ครบเพื่อคำนวณ
            </p>
          )}
        </div>
      </div>

      {savedResults && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <History className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">ผลที่บันทึกไว้</h4>
          </div>
          {savedResults.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              ยังไม่มีผลคำนวณที่บันทึกไว้
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="text-[11px] text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-2 py-1.5">วันที่</th>
                    {savedResults.some((r) => r.clientName) && (
                      <th className="text-left font-medium px-2 py-1.5">ลูกเทรน</th>
                    )}
                    <th className="text-left font-medium px-2 py-1.5">เป้าหมาย</th>
                    <th className="text-right font-medium px-2 py-1.5">แคลอรี่</th>
                    <th className="text-right font-medium px-2 py-1.5">โปรตีน</th>
                    <th className="text-right font-medium px-2 py-1.5">คาร์บ</th>
                    <th className="text-right font-medium px-2 py-1.5">ไขมัน</th>
                    <th className="px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {savedResults.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-2 py-2 whitespace-nowrap">{r.dateLabel}</td>
                      {savedResults.some((s) => s.clientName) && (
                        <td className="px-2 py-2 whitespace-nowrap">
                          {r.clientName ?? "—"}
                        </td>
                      )}
                      <td className="px-2 py-2 whitespace-nowrap">{GOAL_LABEL[r.goal]}</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        {r.calories.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right">{r.protein} g</td>
                      <td className="px-2 py-2 text-right">{r.carb} g</td>
                      <td className="px-2 py-2 text-right">{r.fat} g</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={pending}
                          className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                          title="ลบ"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
