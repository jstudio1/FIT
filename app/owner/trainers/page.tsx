import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Users, Mail, Phone } from "lucide-react";
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
            <span>ติดต่อ</span>
            <span className="text-center">ลูกเทรน</span>
            <span className="text-right">สถานะ</span>
          </div>
          {trainers.map((t, i) => (
            <div
              key={t.id}
              style={{ "--stagger": Math.min(i, 8) } as React.CSSProperties}
              className="animate-fade-up grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 sm:gap-4 px-5 py-4 border-b border-border last:border-0 items-center transition-colors hover:bg-muted/40"
            >
              <Link
                href={`/owner/trainers/${t.id}`}
                className="flex items-center gap-3 font-medium hover:text-primary group min-w-0"
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold overflow-hidden">
                  {t.avatarPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/avatar/${t.id}`}
                      alt={t.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    t.fullName.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate group-hover:underline">
                    {t.fullName}
                    {t.nickname && (
                      <span className="text-muted-foreground font-normal"> ({t.nickname})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal">@{t.username}</div>
                </div>
              </Link>
              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground min-w-0">
                {t.email && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Mail className="size-3 shrink-0" />
                    {t.email}
                  </span>
                )}
                {t.phone && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Phone className="size-3 shrink-0" />
                    {t.phone}
                  </span>
                )}
                {!t.email && !t.phone && <span>—</span>}
              </div>
              <div className="text-sm sm:text-center">
                <span className="sm:hidden text-muted-foreground">ลูกเทรน: </span>
                {counts.get(t.id) ?? 0} คน
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                    t.active
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.active && (
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-foreground/60" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-accent-foreground" />
                    </span>
                  )}
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
