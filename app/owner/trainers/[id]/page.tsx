import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, Users, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { EditTrainerForm } from "@/components/edit-trainer-form";

export const dynamic = "force-dynamic";

export default async function OwnerTrainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("OWNER");
  const { id } = await params;
  const trainerId = Number(id);

  const [trainer] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, trainerId), eq(users.role, "TRAINER")))
    .limit(1);
  if (!trainer) notFound();

  const clients = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "CLIENT"), eq(users.trainerId, trainerId)))
    .orderBy(desc(users.createdAt));

  return (
    <>
      <Link
        href="/owner/trainers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายชื่อเทรนเนอร์
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
          {trainer.fullName.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {trainer.fullName}
          </h1>
          <p className="text-sm text-muted-foreground">
            @{trainer.username} · {trainer.active ? "ใช้งานอยู่" : "ปิดใช้งาน"} ·
            ลูกเทรน {clients.length} คน
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <h3 className="font-semibold mb-4">แก้ไขข้อมูลเทรนเนอร์</h3>
          <EditTrainerForm
            trainer={{
              id: trainer.id,
              fullName: trainer.fullName,
              username: trainer.username,
            }}
          />
        </div>

        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="size-4.5 text-primary" />
            ลูกเทรนภายใต้เทรนเนอร์คนนี้
          </h3>
          {clients.length === 0 ? (
            <div className="text-center py-10 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
              ยังไม่มีลูกเทรน
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/owner/clients/${c.id}`}
                  className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">
                    {c.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.fullName}</div>
                    <div className="text-sm text-muted-foreground">
                      @{c.username}
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
