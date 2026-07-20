import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Users, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { CreateClientForm } from "@/components/create-client-form";

export const dynamic = "force-dynamic";

export default async function TrainerClientsPage() {
  const trainer = await requireRole("TRAINER");

  const clients = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "CLIENT"), eq(users.trainerId, trainer.id)))
    .orderBy(desc(users.createdAt));

  return (
    <>
      <PageHeader title="ลูกเทรน" description="ลูกเทรนของคุณและประวัติของแต่ละคน" />

      <CreateClientForm />

      {clients.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card">
          <Users className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">ยังไม่มีลูกเทรน — กดปุ่มเพิ่มลูกเทรนด้านบน</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/trainer/clients/${c.id}`}
              className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="h-11 w-11 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">
                {c.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.fullName}</div>
                <div className="text-sm text-muted-foreground">@{c.username}</div>
              </div>
              {!c.active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  ปิดใช้งาน
                </span>
              )}
              <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
