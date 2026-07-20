import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { PageHeader } from "@/components/page-header";
import { CreateTrainerForm } from "@/components/create-trainer-form";
import { setTrainerActiveAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function OwnerTrainersPage() {
  const trainers = await db
    .select()
    .from(users)
    .where(eq(users.role, "TRAINER"))
    .orderBy(desc(users.createdAt));

  const countRows = await db
    .select({ trainerId: users.trainerId, c: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "CLIENT"))
    .groupBy(users.trainerId);
  const counts = new Map<number, number>();
  for (const r of countRows) {
    if (r.trainerId != null) counts.set(r.trainerId, Number(r.c));
  }

  return (
    <>
      <PageHeader
        title="เทรนเนอร์"
        description="สร้างและจัดการบัญชีเทรนเนอร์ในระบบ"
      />

      <CreateTrainerForm />

      {trainers.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card">
          <Users className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">ยังไม่มีเทรนเนอร์ในระบบ</p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase">
            <span>ชื่อ</span>
            <span>ชื่อผู้ใช้</span>
            <span className="text-center">ลูกเทรน</span>
            <span className="text-right">สถานะ</span>
          </div>
          {trainers.map((t) => (
            <div
              key={t.id}
              className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 sm:gap-4 px-5 py-4 border-b border-border last:border-0 items-center"
            >
              <Link
                href={`/owner/trainers/${t.id}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {t.fullName}
              </Link>
              <div className="text-sm text-muted-foreground">@{t.username}</div>
              <div className="text-sm sm:text-center">
                <span className="sm:hidden text-muted-foreground">ลูกเทรน: </span>
                {counts.get(t.id) ?? 0} คน
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    t.active
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.active ? "ใช้งาน" : "ปิดใช้งาน"}
                </span>
                <form action={setTrainerActiveAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={(!t.active).toString()}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    {t.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
