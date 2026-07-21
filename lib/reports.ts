import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
} from "date-fns";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "./db";
import { bookings, bookingCancellations, users } from "./db/schema";
import { toDateStr } from "./schedule";
import type { HourBucketMode } from "./training-hours";

export type ReportStatus = "COMPLETED" | "NO_SHOW" | "CANCELLED";

export type ReportRecord = {
  id: string;
  date: string;
  hour: number;
  status: ReportStatus;
  clientId: number;
  clientName: string;
  trainerId: number;
  trainerName: string;
  cancelledBy?: "CLIENT" | "TRAINER";
};

export type ReportSummary = {
  completed: number;
  noShow: number;
  cancelled: number;
  total: number;
};

export function summarizeRecords(records: ReportRecord[]): ReportSummary {
  let completed = 0;
  let noShow = 0;
  let cancelled = 0;
  for (const r of records) {
    if (r.status === "COMPLETED") completed++;
    else if (r.status === "NO_SHOW") noShow++;
    else cancelled++;
  }
  return { completed, noShow, cancelled, total: completed + noShow + cancelled };
}

export type ReportBucket = {
  label: string;
  completed: number;
  noShow: number;
  cancelled: number;
};

type Counts = { completed: number; noShow: number; cancelled: number };

export function buildReportBuckets(
  mode: HourBucketMode,
  from: Date,
  to: Date,
  records: ReportRecord[],
): ReportBucket[] {
  const byDate = new Map<string, Counts>();
  for (const r of records) {
    const cur = byDate.get(r.date) ?? { completed: 0, noShow: 0, cancelled: 0 };
    if (r.status === "COMPLETED") cur.completed++;
    else if (r.status === "NO_SHOW") cur.noShow++;
    else cur.cancelled++;
    byDate.set(r.date, cur);
  }

  if (mode === "day") {
    return eachDayOfInterval({ start: from, end: to }).map((d) => {
      const c = byDate.get(toDateStr(d));
      return {
        label: format(d, "d/M"),
        completed: c?.completed ?? 0,
        noShow: c?.noShow ?? 0,
        cancelled: c?.cancelled ?? 0,
      };
    });
  }

  if (mode === "week") {
    const weeks = eachWeekOfInterval(
      { start: from, end: to },
      { weekStartsOn: 1 },
    );
    return weeks.map((ws) => {
      let completed = 0;
      let noShow = 0;
      let cancelled = 0;
      for (let i = 0; i < 7; i++) {
        const day = new Date(ws.getTime() + i * 86400000);
        const c = byDate.get(toDateStr(day));
        if (c) {
          completed += c.completed;
          noShow += c.noShow;
          cancelled += c.cancelled;
        }
      }
      return { label: format(ws, "d/M"), completed, noShow, cancelled };
    });
  }

  const months = eachMonthOfInterval({ start: from, end: to });
  return months.map((m) => {
    const monthKey = format(m, "yyyy-MM");
    let completed = 0;
    let noShow = 0;
    let cancelled = 0;
    for (const [dateStr, c] of byDate) {
      if (dateStr.startsWith(monthKey)) {
        completed += c.completed;
        noShow += c.noShow;
        cancelled += c.cancelled;
      }
    }
    return { label: format(m, "MM/yyyy"), completed, noShow, cancelled };
  });
}

/** เรียงล่าสุดก่อน + จำกัดจำนวนแถวแสดงผลกันตารางยาวเกินไป */
export function sortAndCapRecords(
  records: ReportRecord[],
  max = 200,
): { rows: ReportRecord[]; truncated: boolean } {
  const sorted = [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.hour - a.hour;
  });
  return { rows: sorted.slice(0, max), truncated: sorted.length > max };
}

/**
 * ดึงประวัติการเทรน (สำเร็จ/ขาด จากตาราง bookings + ยกเลิก จากตาราง booking_cancellations)
 * ของเทรนเนอร์ที่ระบุ ในช่วงวันที่ที่กำหนด — รวมเป็นรายการเดียวกันสำหรับทำรายงาน
 */
export async function fetchReportRecords(
  trainerIds: number[],
  fromDateStr: string,
  toDateStr: string,
): Promise<ReportRecord[]> {
  if (trainerIds.length === 0) return [];

  const clientU = alias(users, "report_client");
  const trainerU = alias(users, "report_trainer");

  const [completedRows, noShowRows, cancelledRows] = await Promise.all([
    db
      .select({
        id: bookings.id,
        date: bookings.date,
        hour: bookings.hour,
        clientId: bookings.clientId,
        clientName: clientU.fullName,
        trainerId: bookings.trainerId,
        trainerName: trainerU.fullName,
      })
      .from(bookings)
      .innerJoin(clientU, eq(clientU.id, bookings.clientId))
      .innerJoin(trainerU, eq(trainerU.id, bookings.trainerId))
      .where(
        and(
          inArray(bookings.trainerId, trainerIds),
          eq(bookings.status, "COMPLETED"),
          gte(bookings.date, fromDateStr),
          lte(bookings.date, toDateStr),
        ),
      ),
    db
      .select({
        id: bookings.id,
        date: bookings.date,
        hour: bookings.hour,
        clientId: bookings.clientId,
        clientName: clientU.fullName,
        trainerId: bookings.trainerId,
        trainerName: trainerU.fullName,
      })
      .from(bookings)
      .innerJoin(clientU, eq(clientU.id, bookings.clientId))
      .innerJoin(trainerU, eq(trainerU.id, bookings.trainerId))
      .where(
        and(
          inArray(bookings.trainerId, trainerIds),
          eq(bookings.status, "NO_SHOW"),
          gte(bookings.date, fromDateStr),
          lte(bookings.date, toDateStr),
        ),
      ),
    db
      .select({
        id: bookingCancellations.id,
        date: bookingCancellations.date,
        hour: bookingCancellations.hour,
        clientId: bookingCancellations.clientId,
        clientName: clientU.fullName,
        trainerId: bookingCancellations.trainerId,
        trainerName: trainerU.fullName,
        cancelledBy: bookingCancellations.cancelledBy,
      })
      .from(bookingCancellations)
      .innerJoin(clientU, eq(clientU.id, bookingCancellations.clientId))
      .innerJoin(trainerU, eq(trainerU.id, bookingCancellations.trainerId))
      .where(
        and(
          inArray(bookingCancellations.trainerId, trainerIds),
          gte(bookingCancellations.date, fromDateStr),
          lte(bookingCancellations.date, toDateStr),
        ),
      ),
  ]);

  return [
    ...completedRows.map(
      (r): ReportRecord => ({ ...r, id: `c-${r.id}`, status: "COMPLETED" }),
    ),
    ...noShowRows.map(
      (r): ReportRecord => ({ ...r, id: `n-${r.id}`, status: "NO_SHOW" }),
    ),
    ...cancelledRows.map(
      (r): ReportRecord => ({ ...r, id: `x-${r.id}`, status: "CANCELLED" }),
    ),
  ];
}
