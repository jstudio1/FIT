import { addDays } from "date-fns";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { Users, UserCog, CalendarCheck } from "lucide-react";
import { db } from "@/lib/db";
import { users, bookings } from "@/lib/db/schema";
import { weekStart, toDateStr } from "@/lib/schedule";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function OwnerOverviewPage() {
  const ws = weekStart(new Date());
  const weekFrom = toDateStr(ws);
  const weekTo = toDateStr(addDays(ws, 6));
  const [weekBookings] = await db
    .select({ c: sql<number>`count(*)` })
    .from(bookings)
    .where(and(gte(bookings.date, weekFrom), lte(bookings.date, weekTo)));

  const [trainerCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "TRAINER"));
  const [activeTrainerCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.role} = 'TRAINER' and ${users.active} = 1`);
  const [clientCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "CLIENT"));

  return (
    <>
      <PageHeader
        title="ภาพรวมระบบ"
        description="สรุปภาพรวมทั้งระบบสำหรับเจ้าของ"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="เทรนเนอร์ทั้งหมด"
          value={Number(trainerCount?.c ?? 0)}
          icon={UserCog}
          hint={`ใช้งานอยู่ ${Number(activeTrainerCount?.c ?? 0)} คน`}
        />
        <StatCard
          label="ลูกเทรนทั้งหมด"
          value={Number(clientCount?.c ?? 0)}
          icon={Users}
        />
        <StatCard
          label="การจองสัปดาห์นี้"
          value={Number(weekBookings?.c ?? 0)}
          icon={CalendarCheck}
          hint={`${weekFrom} – ${weekTo}`}
        />
      </div>

      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold mb-1">เริ่มต้นใช้งาน</h3>
        <p className="text-sm text-muted-foreground">
          ไปที่หน้า <span className="font-medium text-foreground">เทรนเนอร์</span>{" "}
          เพื่อสร้างบัญชีเทรนเนอร์ จากนั้นเทรนเนอร์แต่ละคนจะสร้างบัญชีลูกเทรนของตัวเองได้
        </p>
      </div>
    </>
  );
}
