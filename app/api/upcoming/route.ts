import { NextResponse } from "next/server";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { toDateStr } from "@/lib/schedule";

/** นัดที่ยังไม่ถึง (วันนี้เป็นต้นไป) ของผู้ใช้ — ใช้ทำป็อปอัพเตือน */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ items: [] });

  const today = toDateStr(new Date());
  const col = user.role === "TRAINER" ? bookings.trainerId : bookings.clientId;

  if (user.role === "OWNER") return NextResponse.json({ items: [] });

  const rows = await db
    .select({ date: bookings.date, hour: bookings.hour })
    .from(bookings)
    .where(and(eq(col, user.id), gte(bookings.date, today)))
    .orderBy(asc(bookings.date), asc(bookings.hour))
    .limit(20);

  return NextResponse.json({ items: rows });
}
