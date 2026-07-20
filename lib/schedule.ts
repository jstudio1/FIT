import { addDays, startOfWeek, format } from "date-fns";

export const OPEN_HOUR = 8; // 08:00
export const CLOSE_HOUR = 20; // 20:00 (ช่องสุดท้ายเริ่ม 19:00)
export const HOURS: number[] = Array.from(
  { length: CLOSE_HOUR - OPEN_HOUR },
  (_, i) => OPEN_HOUR + i,
); // [8..19]
export const CANCEL_WINDOW_HOURS = 6;

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

export function isValidSlot(dateStr: string, hour: number): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && HOURS.includes(hour);
}
