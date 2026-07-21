import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
} from "date-fns";
import { toDateStr } from "./schedule";

export type HourBucketMode = "day" | "week" | "month";

const MAX_SPAN_DAYS: Record<HourBucketMode, number> = {
  day: 92, // ~3 เดือน
  week: 53 * 7, // ~1 ปี
  month: 36 * 31, // ~3 ปี
};

/** จำกัดช่วงวันที่ไม่ให้กว้างเกินไปสำหรับมุมมองที่เลือก (กันกราฟแท่งเยอะเกินจนอ่านไม่ออก) */
export function clampRangeForMode(
  mode: HourBucketMode,
  from: Date,
  to: Date,
): { from: Date; to: Date; clamped: boolean } {
  const maxDays = MAX_SPAN_DAYS[mode];
  const spanDays = Math.round((to.getTime() - from.getTime()) / 86400000);
  if (spanDays > maxDays) {
    return {
      from,
      to: new Date(from.getTime() + maxDays * 86400000),
      clamped: true,
    };
  }
  return { from, to, clamped: false };
}

/**
 * แบ่งช่วง [from, to] เป็นแท่งกราฟตาม mode โดยเติมช่วงที่ไม่มีข้อมูลด้วย 0
 * completedDates = วันที่ (yyyy-mm-dd) ของนัดที่ COMPLETED แต่ละรายการ (1 รายการ = 1 ชั่วโมง)
 */
export function buildHourBuckets(
  mode: HourBucketMode,
  from: Date,
  to: Date,
  completedDates: string[],
): { label: string; hours: number }[] {
  const countByDate = new Map<string, number>();
  for (const d of completedDates) {
    countByDate.set(d, (countByDate.get(d) ?? 0) + 1);
  }

  if (mode === "day") {
    return eachDayOfInterval({ start: from, end: to }).map((d) => ({
      label: format(d, "d/M"),
      hours: countByDate.get(toDateStr(d)) ?? 0,
    }));
  }

  if (mode === "week") {
    const weeks = eachWeekOfInterval(
      { start: from, end: to },
      { weekStartsOn: 1 },
    );
    return weeks.map((ws) => {
      let sum = 0;
      for (let i = 0; i < 7; i++) {
        const day = new Date(ws.getTime() + i * 86400000);
        sum += countByDate.get(toDateStr(day)) ?? 0;
      }
      return { label: format(ws, "d/M"), hours: sum };
    });
  }

  const months = eachMonthOfInterval({ start: from, end: to });
  return months.map((m) => {
    const monthKey = format(m, "yyyy-MM");
    let sum = 0;
    for (const [dateStr, count] of countByDate) {
      if (dateStr.startsWith(monthKey)) sum += count;
    }
    return { label: format(m, "MM/yyyy"), hours: sum };
  });
}
