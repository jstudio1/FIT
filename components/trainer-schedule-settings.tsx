"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, CalendarOff, Coffee, X } from "lucide-react";
import {
  updateWorkingHoursAction,
  blockDateRangeAction,
  unblockDateRangeAction,
  addRecurringBreakAction,
  removeRecurringBreakAction,
} from "@/app/_actions/booking";
import { hourLabel } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i); // 0..24

export type BlockedDayGroup = {
  date: string;
  blockedCount: number;
  totalHours: number;
};

export type HourRange = { from: number; to: number };

function HourSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  options: number[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex h-10 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      {options.map((h) => (
        <option key={h} value={h}>
          {hourLabel(h)}
        </option>
      ))}
    </select>
  );
}

export function TrainerScheduleSettings({
  openHour,
  closeHour,
  blockedDays,
  recurringRanges,
}: {
  openHour: number;
  closeHour: number;
  blockedDays: BlockedDayGroup[];
  recurringRanges: HourRange[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openH, setOpenH] = useState(openHour);
  const [closeH, setCloseH] = useState(closeHour);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [breakFromH, setBreakFromH] = useState(12);
  const [breakToH, setBreakToH] = useState(13);

  function run(fn: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "สำเร็จ");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* เวลาทำการ */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-4.5 text-primary" />
            <h3 className="font-semibold">เวลาทำการ</h3>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="openH">เปิดรับตั้งแต่</Label>
              <HourSelect
                id="openH"
                value={openH}
                onChange={setOpenH}
                options={HOUR_OPTIONS.filter((h) => h < 24)}
              />
            </div>
            <span className="text-muted-foreground pb-2.5">ถึง</span>
            <div>
              <Label htmlFor="closeH">ปิดรับตอน</Label>
              <HourSelect
                id="closeH"
                value={closeH}
                onChange={setCloseH}
                options={HOUR_OPTIONS.filter((h) => h > 0)}
              />
            </div>
            <Button
              onClick={() => run(() => updateWorkingHoursAction(openH, closeH))}
              disabled={pending}
              size="sm"
              className="h-10"
            >
              บันทึก
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ช่วงเวลาปัจจุบัน: {hourLabel(openHour)}–{hourLabel(closeHour)} (1
            ช่อง = 1 ชั่วโมง)
          </p>
        </div>

        {/* พักประจำวัน */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="size-4.5 text-primary" />
            <h3 className="font-semibold">พักประจำวัน (ทุกวัน ตลอดไป)</h3>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="breakFromH">ไม่รับตั้งแต่</Label>
              <HourSelect
                id="breakFromH"
                value={breakFromH}
                onChange={setBreakFromH}
                options={HOUR_OPTIONS.filter((h) => h < 24)}
              />
            </div>
            <span className="text-muted-foreground pb-2.5">ถึง</span>
            <div>
              <Label htmlFor="breakToH">ถึง</Label>
              <HourSelect
                id="breakToH"
                value={breakToH}
                onChange={setBreakToH}
                options={HOUR_OPTIONS.filter((h) => h > 0)}
              />
            </div>
            <Button
              onClick={() =>
                run(() => addRecurringBreakAction(breakFromH, breakToH))
              }
              disabled={pending}
              variant="destructive"
              size="sm"
              className="h-10"
            >
              ตั้งเป็นพักประจำ
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ช่วงนี้จะไม่รับเทรนทุกวันโดยอัตโนมัติ ไม่ต้องปิดทีละวัน
          </p>

          {recurringRanges.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {recurringRanges.map((r) => (
                <li
                  key={`${r.from}-${r.to}`}
                  className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-1.5"
                >
                  <span>
                    {hourLabel(r.from)}–{hourLabel(r.to)}
                  </span>
                  <button
                    onClick={() =>
                      run(() => removeRecurringBreakAction(r.from, r.to))
                    }
                    disabled={pending}
                    className="p-1 rounded hover:bg-card text-muted-foreground hover:text-destructive disabled:opacity-50"
                    title="ยกเลิกพักประจำช่วงนี้"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ปิดรับช่วงวันที่ */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarOff className="size-4.5 text-primary" />
          <h3 className="font-semibold">ปิดรับช่วงวันที่ (เช่น ลาพัก/ทั้งเดือน)</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3 max-w-md">
          <div>
            <Label htmlFor="fromDate">ตั้งแต่วันที่</Label>
            <Input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="toDate">ถึงวันที่</Label>
            <Input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (!fromDate || !toDate) {
                toast.error("กรุณาเลือกวันที่เริ่มและสิ้นสุด");
                return;
              }
              run(() => blockDateRangeAction(fromDate, toDate));
            }}
            disabled={pending}
            variant="destructive"
            size="sm"
          >
            ปิดรับช่วงนี้
          </Button>
          <Button
            onClick={() => {
              if (!fromDate || !toDate) {
                toast.error("กรุณาเลือกวันที่เริ่มและสิ้นสุด");
                return;
              }
              run(() => unblockDateRangeAction(fromDate, toDate));
            }}
            disabled={pending}
            variant="outline"
            size="sm"
          >
            เปิดรับช่วงนี้อีกครั้ง
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          ปิดรับทุกชั่วโมงทำการในช่วงที่เลือก (ช่องที่มีคนจองไว้แล้วจะไม่ถูกปิด)
        </p>

        {blockedDays.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">
              ช่วงที่ปิดรับอยู่ตอนนี้
            </p>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {blockedDays.map((d) => (
                <li
                  key={d.date}
                  className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-1.5"
                >
                  <span>
                    {d.date}{" "}
                    <span className="text-xs text-muted-foreground">
                      (
                      {d.blockedCount >= d.totalHours
                        ? "ปิดทั้งวัน"
                        : `ปิด ${d.blockedCount} ชม.`}
                      )
                    </span>
                  </span>
                  <button
                    onClick={() => run(() => unblockDateRangeAction(d.date, d.date))}
                    disabled={pending}
                    className="p-1 rounded hover:bg-card text-muted-foreground hover:text-destructive disabled:opacity-50"
                    title="เปิดวันนี้อีกครั้ง"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
