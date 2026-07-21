import { addDays, startOfWeek, format } from "date-fns";

export const OPEN_HOUR = 8; // ค่าเริ่มต้น (ใช้เมื่อเทรนเนอร์ยังไม่ได้ตั้งค่า)
export const CLOSE_HOUR = 20; // ค่าเริ่มต้น
export const CANCEL_WINDOW_HOURS = 6;

/** สร้างรายการชั่วโมงที่จองได้ [openHour..closeHour-1] ตามเวลาทำการของเทรนเนอร์ */
export function getHoursRange(openHour: number, closeHour: number): number[] {
  return Array.from(
    { length: Math.max(0, closeHour - openHour) },
    (_, i) => openHour + i,
  );
}

export const THAI_DAYS = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];
export const THAI_DAYS_SHORT = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

export function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** วันจันทร์ของสัปดาห์ที่มี base */
export function weekStart(base: Date): Date {
  return startOfWeek(base, { weekStartsOn: 1 });
}

export type WeekDay = {
  date: Date;
  dateStr: string;
  dayShort: string;
  dayLong: string;
  dayNum: string;
};

export function getWeekDays(base: Date): WeekDay[] {
  const start = weekStart(base);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return {
      date: d,
      dateStr: toDateStr(d),
      dayShort: THAI_DAYS_SHORT[i],
      dayLong: THAI_DAYS[i],
      dayNum: format(d, "d/M"),
    };
  });
}

export function slotStart(dateStr: string, hour: number): Date {
  return new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00`);
}

export function isPastSlot(
  dateStr: string,
  hour: number,
  now: Date = new Date(),
): boolean {
  return slotStart(dateStr, hour).getTime() <= now.getTime();
}

/** ยกเลิกได้เมื่อเหลือเวลา > 6 ชั่วโมงก่อนเริ่ม */
export function canCancelSlot(
  dateStr: string,
  hour: number,
  now: Date = new Date(),
): boolean {
  return (
    slotStart(dateStr, hour).getTime() - now.getTime() >
    CANCEL_WINDOW_HOURS * 3600 * 1000
  );
}

export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function slotRangeLabel(h: number): string {
  return `${hourLabel(h)}-${hourLabel(h + 1)}`;
}

/** จับกลุ่มชั่วโมงที่ติดกันให้เป็นช่วง เช่น [12,13] -> [{from:12,to:14}] */
export function groupConsecutiveHours(
  hours: number[],
): { from: number; to: number }[] {
  const sorted = [...hours].sort((a, b) => a - b);
  const groups: { from: number; to: number }[] = [];
  for (const h of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.to === h) {
      last.to = h + 1;
    } else {
      groups.push({ from: h, to: h + 1 });
    }
  }
  return groups;
}

export function isValidSlot(
  dateStr: string,
  hour: number,
  openHour: number = OPEN_HOUR,
  closeHour: number = CLOSE_HOUR,
): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(dateStr) &&
    Number.isInteger(hour) &&
    hour >= openHour &&
    hour < closeHour
  );
}
