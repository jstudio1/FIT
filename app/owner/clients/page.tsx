import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { UsersRound, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function OwnerAllClientsPage() {
  await requireRole("OWNER");

  const trainerU = alias(users, "trainer");
  const clients = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      active: users.active,
      trainerName: trainerU.fullName,
    })
    .from(users)
    .leftJoin(trainerU, eq(trainerU.id, users.trainerId))
    .where(eq(users.role, "CLIENT"))
    .orderBy(desc(users.createdAt));

  return (
    <>
      <PageHeader
        title="ลูกเทรนทั้งหมด"
        description={`ลูกเทรนทั้งระบบ ${clients.length} คน`}
      />

      {clients.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card">
          <UsersRound className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">ยังไม่มีลูกเทรนในระบบ</p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase">
            <span>ชื่อ</span>
            <span>ชื่อผู้ใช้</span>
            <span>เทรนเนอร์</span>
            <span />
          </div>
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/owner/clients/${c.id}`}
              className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-1 sm:gap-4 px-5 py-3.5 border-b border-border last:border-0 items-center hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium flex items-center gap-2">
                {c.fullName}
                {!c.active && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    ปิด
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">@{c.username}</div>
              <div className="text-sm">
                <span className="sm:hidden text-muted-foreground">เทรนเนอร์: </span>
                {c.trainerName ?? "—"}
              </div>
              <ChevronRight className="hidden sm:block size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
