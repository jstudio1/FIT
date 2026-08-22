"use client";

import { useMemo, useState } from "react";
import {
  Ruler,
  Dumbbell,
  HeartPulse,
  Flame,
  Droplets,
  Calculator,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BmiTdeeCalculator,
  type CalculatorClientOption,
  type SavedCalculatorResult,
} from "@/components/bmi-tdee-calculator";

type Gender = "MALE" | "FEMALE";
type ToolKey = "bmi" | "bodyfat" | "onerm" | "hrzone" | "burn" | "water";

const TOOLS: { key: ToolKey; label: string; icon: LucideIcon }[] = [
  { key: "bmi", label: "BMI / TDEE", icon: Calculator },
  { key: "bodyfat", label: "% ไขมัน (สายวัด)", icon: Ruler },
  { key: "onerm", label: "น้ำหนักยกสูงสุด", icon: Dumbbell },
  { key: "hrzone", label: "โซนหัวใจ", icon: HeartPulse },
  { key: "burn", label: "แคลอรี่ที่เผา", icon: Flame },
  { key: "water", label: "น้ำที่ควรดื่ม", icon: Droplets },
];

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
}) {
  return (
    <label className="text-xs text-muted-foreground block">
      {label}
      <div className="relative mt-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full px-2.5 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
        {unit && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

function GenderToggle({ value, onChange }: { value: Gender; onChange: (g: Gender) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["MALE", "FEMALE"] as Gender[]).map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(g)}
          className={cn(
            "h-10 rounded-md border text-sm font-medium transition-colors",
            value === g
              ? "bg-primary text-primary-foreground border-transparent"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {g === "MALE" ? "ผู้ชาย" : "ผู้หญิง"}
        </button>
      ))}
    </div>
  );
}

function ToolShell({
  icon: Icon,
  title,
  inputs,
  result,
}: {
  icon: LucideIcon;
  title: string;
  inputs: React.ReactNode;
  result: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="size-5 text-primary" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        {inputs}
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="size-5 text-primary" />
          <h3 className="font-semibold">ผลลัพธ์</h3>
        </div>
        {result}
      </div>
    </div>
  );
}

function EmptyResult({ hint }: { hint?: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-8">
      {hint ?? "กรอกข้อมูลด้านซ้ายให้ครบเพื่อคำนวณ"}
    </p>
  );
}

/* ---------------- 1) % ไขมัน (US Navy Method — วัดด้วยสายวัด) ---------------- */
function bodyFatCategory(bf: number, gender: Gender): { label: string; color: string } {
  const thresholds =
    gender === "MALE" ? [6, 14, 18, 25] : [14, 21, 25, 32];
  const labels = ["ต่ำมาก (Essential)", "นักกีฬา (Athletic)", "ฟิต (Fitness)", "ปกติ (Average)", "สูง (Obese)"];
  const colors = ["text-blue-600", "text-primary", "text-primary", "text-amber-600", "text-destructive"];
  const idx = thresholds.findIndex((t) => bf < t);
  const i = idx === -1 ? labels.length - 1 : idx;
  return { label: labels[i], color: colors[i] };
}

function BodyFatTool() {
  const [gender, setGender] = useState<Gender>("MALE");
  const [neck, setNeck] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [height, setHeight] = useState("");

  const result = useMemo(() => {
    const n = Number(neck);
    const w = Number(waist);
    const h = Number(hip);
    const ht = Number(height);
    if (!n || !w || !ht || n <= 0 || w <= 0 || ht <= 0) return { error: null as string | null, bf: null as number | null };
    if (gender === "FEMALE" && (!h || h <= 0)) return { error: null, bf: null };

    const diff = gender === "MALE" ? w - n : w + h - n;
    if (diff <= 0) {
      return { error: "รอบเอว (+รอบสะโพก) ต้องมากกว่ารอบคอ กรุณาตรวจสอบตัวเลข", bf: null };
    }

    const bf =
      gender === "MALE"
        ? 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(ht)) - 450
        : 495 / (1.29579 - 0.35004 * Math.log10(diff) + 0.221 * Math.log10(ht)) - 450;

    if (!Number.isFinite(bf) || bf <= 0 || bf > 70) {
      return { error: "ตัวเลขที่กรอกดูผิดปกติ ลองตรวจสอบอีกครั้ง", bf: null };
    }
    return { error: null, bf };
  }, [gender, neck, waist, hip, height]);

  return (
    <ToolShell
      icon={Ruler}
      title="% ไขมันในร่างกาย (วัดด้วยสายวัด)"
      inputs={
        <>
          <p className="text-xs text-muted-foreground -mt-1 mb-2">
            สูตร US Navy Method — ใช้สายวัดผ้าธรรมดา ไม่ต้องมีเครื่อง InBody
          </p>
          <GenderToggle value={gender} onChange={setGender} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="รอบคอ" value={neck} onChange={setNeck} placeholder="38" unit="ซม." />
            <NumberField label="รอบเอว" value={waist} onChange={setWaist} placeholder="80" unit="ซม." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {gender === "FEMALE" && (
              <NumberField label="รอบสะโพก" value={hip} onChange={setHip} placeholder="95" unit="ซม." />
            )}
            <NumberField label="ส่วนสูง" value={height} onChange={setHeight} placeholder="170" unit="ซม." />
          </div>
        </>
      }
      result={
        result.error ? (
          <p className="text-sm text-destructive text-center py-8">{result.error}</p>
        ) : result.bf != null ? (
          <div className="space-y-3">
            <div className="rounded-md bg-primary/10 p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">เปอร์เซ็นต์ไขมัน</div>
              <div className="text-3xl font-bold text-primary">{result.bf.toFixed(1)}%</div>
              <div className={cn("text-sm font-medium mt-1", bodyFatCategory(result.bf, gender).color)}>
                {bodyFatCategory(result.bf, gender).label}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              ค่าประมาณจากสัดส่วนร่างกาย ความแม่นยำน้อยกว่าเครื่องวัดโดยตรง เหมาะสำหรับติดตามแนวโน้มเป็นระยะ
            </p>
          </div>
        ) : (
          <EmptyResult />
        )
      }
    />
  );
}

/* ---------------- 2) น้ำหนักยกสูงสุด (1RM) ---------------- */
const PCT_TABLE = [100, 95, 90, 85, 80, 75, 70, 65, 60];

function OneRmTool() {
  const [liftWeight, setLiftWeight] = useState("");
  const [reps, setReps] = useState("");

  const result = useMemo(() => {
    const w = Number(liftWeight);
    const r = Number(reps);
    if (!w || !r || w <= 0 || r <= 0) return null;
    if (r === 1) return { oneRm: w };
    if (r > 15) return { error: "สูตรนี้แม่นยำที่สุดตอนทำได้ไม่เกิน ~12-15 ครั้ง" };
    const epley = w * (1 + r / 30);
    return { oneRm: Math.round(epley * 10) / 10 };
  }, [liftWeight, reps]);

  return (
    <ToolShell
      icon={Dumbbell}
      title="คำนวณน้ำหนักยกสูงสุด (1RM)"
      inputs={
        <>
          <p className="text-xs text-muted-foreground -mt-1 mb-2">
            สูตร Epley — ประมาณจากน้ำหนักและจำนวนครั้งที่ยกไหว
          </p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="น้ำหนักที่ยก" value={liftWeight} onChange={setLiftWeight} placeholder="60" unit="กก." />
            <NumberField label="ยกได้กี่ครั้ง" value={reps} onChange={setReps} placeholder="8" unit="ครั้ง" />
          </div>
        </>
      }
      result={
        result && "error" in result ? (
          <p className="text-sm text-destructive text-center py-8">{result.error}</p>
        ) : result ? (
          <div className="space-y-3">
            <div className="rounded-md bg-primary/10 p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">น้ำหนักยกสูงสุดโดยประมาณ (1RM)</div>
              <div className="text-3xl font-bold text-primary">{result.oneRm.toLocaleString()} กก.</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">ตารางน้ำหนักฝึกตาม %1RM</div>
              <div className="grid grid-cols-3 gap-1.5">
                {PCT_TABLE.map((pct) => (
                  <div key={pct} className="rounded-md bg-muted/50 p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">{pct}%</div>
                    <div className="text-xs font-semibold">
                      {Math.round(((result.oneRm * pct) / 100) * 2) / 2} กก.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyResult />
        )
      }
    />
  );
}

/* ---------------- 3) โซนอัตราการเต้นหัวใจ ---------------- */
const HR_ZONES = [
  { label: "โซน 1 · วอร์มอัพ", desc: "เบามาก", from: 0.5, to: 0.6 },
  { label: "โซน 2 · เผาผลาญไขมัน", desc: "เบา-ปานกลาง", from: 0.6, to: 0.7 },
  { label: "โซน 3 · คาร์ดิโอ", desc: "ปานกลาง", from: 0.7, to: 0.8 },
  { label: "โซน 4 · หนัก", desc: "หนัก (Anaerobic)", from: 0.8, to: 0.9 },
  { label: "โซน 5 · สูงสุด", desc: "หนักมาก", from: 0.9, to: 1.0 },
];

function HrZoneTool() {
  const [age, setAge] = useState("");

  const result = useMemo(() => {
    const a = Number(age);
    if (!a || a <= 0 || a > 110) return null;
    const maxHr = 220 - a;
    return {
      maxHr,
      zones: HR_ZONES.map((z) => ({
        ...z,
        fromBpm: Math.round(maxHr * z.from),
        toBpm: Math.round(maxHr * z.to),
      })),
    };
  }, [age]);

  return (
    <ToolShell
      icon={HeartPulse}
      title="โซนอัตราการเต้นหัวใจ"
      inputs={
        <>
          <p className="text-xs text-muted-foreground -mt-1 mb-2">
            คำนวณจากอายุ (Max HR = 220 - อายุ) ใช้คุมความหนักตอนคาร์ดิโอ
          </p>
          <NumberField label="อายุ" value={age} onChange={setAge} placeholder="30" unit="ปี" />
        </>
      }
      result={
        result ? (
          <div className="space-y-3">
            <div className="rounded-md bg-primary/10 p-3 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">อัตราการเต้นหัวใจสูงสุด (Max HR)</div>
              <div className="text-2xl font-bold text-primary">{result.maxHr} bpm</div>
            </div>
            <div className="space-y-1.5">
              {result.zones.map((z) => (
                <div
                  key={z.label}
                  className="rounded-md bg-muted/50 px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-medium">{z.label}</div>
                    <div className="text-[10px] text-muted-foreground">{z.desc}</div>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {z.fromBpm}-{z.toBpm} bpm
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyResult />
        )
      }
    />
  );
}

/* ---------------- 4) แคลอรี่ที่เผาจากการออกกำลังกาย (MET) ---------------- */
const ACTIVITIES = [
  { value: "walk_slow", label: "เดินเบาๆ (~4 กม./ชม.)", met: 2.8 },
  { value: "walk_brisk", label: "เดินเร็ว (~5.5 กม./ชม.)", met: 3.8 },
  { value: "jog", label: "วิ่งเหยาะๆ (~8 กม./ชม.)", met: 8.3 },
  { value: "run", label: "วิ่งเร็ว (~10 กม./ชม.)", met: 9.8 },
  { value: "cycle", label: "ปั่นจักรยาน ปานกลาง", met: 7.5 },
  { value: "swim", label: "ว่ายน้ำ ปานกลาง", met: 6.0 },
  { value: "weights", label: "เวทเทรนนิ่ง", met: 6.0 },
  { value: "yoga", label: "โยคะ", met: 2.5 },
  { value: "aerobic", label: "แอโรบิก", met: 7.3 },
  { value: "jumprope", label: "กระโดดเชือก", met: 11.0 },
];

function BurnTool() {
  const [activity, setActivity] = useState(ACTIVITIES[1].value);
  const [duration, setDuration] = useState("");
  const [weight, setWeight] = useState("");

  const result = useMemo(() => {
    const d = Number(duration);
    const w = Number(weight);
    if (!d || !w || d <= 0 || w <= 0) return null;
    const met = ACTIVITIES.find((a) => a.value === activity)?.met ?? 0;
    const calories = met * w * (d / 60);
    return { calories: Math.round(calories) };
  }, [activity, duration, weight]);

  return (
    <ToolShell
      icon={Flame}
      title="แคลอรี่ที่เผาจากการออกกำลังกาย"
      inputs={
        <>
          <label className="text-xs text-muted-foreground block">
            กิจกรรม
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="mt-1 h-10 w-full px-2.5 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {ACTIVITIES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="ระยะเวลา" value={duration} onChange={setDuration} placeholder="30" unit="นาที" />
            <NumberField label="น้ำหนักตัว" value={weight} onChange={setWeight} placeholder="65" unit="กก." />
          </div>
        </>
      }
      result={
        result ? (
          <div className="rounded-md bg-primary/10 p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">แคลอรี่ที่เผาโดยประมาณ</div>
            <div className="text-3xl font-bold text-primary">{result.calories.toLocaleString()} kcal</div>
          </div>
        ) : (
          <EmptyResult />
        )
      }
    />
  );
}

/* ---------------- 5) น้ำที่ควรดื่มต่อวัน ---------------- */
function WaterTool() {
  const [weight, setWeight] = useState("");
  const [exerciseMinutes, setExerciseMinutes] = useState("");

  const result = useMemo(() => {
    const w = Number(weight);
    if (!w || w <= 0) return null;
    const ex = Number(exerciseMinutes) || 0;
    const baseMl = w * 33;
    const extraMl = (ex / 30) * 350;
    const totalMl = Math.round(baseMl + extraMl);
    return { totalMl, liters: totalMl / 1000, cups: Math.round(totalMl / 250) };
  }, [weight, exerciseMinutes]);

  return (
    <ToolShell
      icon={Droplets}
      title="ปริมาณน้ำที่ควรดื่มต่อวัน"
      inputs={
        <>
          <NumberField label="น้ำหนักตัว" value={weight} onChange={setWeight} placeholder="65" unit="กก." />
          <NumberField
            label="ออกกำลังกายวันนี้ (ไม่บังคับ)"
            value={exerciseMinutes}
            onChange={setExerciseMinutes}
            placeholder="0"
            unit="นาที"
          />
        </>
      }
      result={
        result ? (
          <div className="space-y-3">
            <div className="rounded-md bg-primary/10 p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">ปริมาณน้ำที่ควรดื่ม</div>
              <div className="text-3xl font-bold text-primary">{result.liters.toFixed(1)} ลิตร</div>
              <div className="text-xs text-muted-foreground mt-1">≈ {result.cups} แก้ว (250 มล./แก้ว)</div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              คำนวณจากน้ำหนักตัว 33 มล./กก. บวกเพิ่มตามเวลาออกกำลังกาย
            </p>
          </div>
        ) : (
          <EmptyResult />
        )
      }
    />
  );
}

/* ---------------- Panel รวม พร้อมแท็บสลับเครื่องมือ ---------------- */
export function HealthToolsPanel({
  bmiClients,
  bmiSavedResults,
}: {
  bmiClients?: CalculatorClientOption[];
  bmiSavedResults: SavedCalculatorResult[];
}) {
  const [tab, setTab] = useState<ToolKey>("bmi");

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 pl-3.5 pr-4 py-2 rounded-full text-sm font-medium border transition-all",
                active
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "bmi" && (
        <BmiTdeeCalculator clients={bmiClients} savedResults={bmiSavedResults} />
      )}
      {tab === "bodyfat" && <BodyFatTool />}
      {tab === "onerm" && <OneRmTool />}
      {tab === "hrzone" && <HrZoneTool />}
      {tab === "burn" && <BurnTool />}
      {tab === "water" && <WaterTool />}
    </div>
  );
}
