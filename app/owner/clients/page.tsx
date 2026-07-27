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
      nickname: users.nickname,
      username: users.username,
      email: users.email,
      phone: users.phone,
      avatarPath: users.avatarPath,
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
            <span>ติดต่อ</span>
            <span>เทรนเนอร์</span>
            <span />
          </div>
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/owner/clients/${c.id}`}
              className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-1 sm:gap-4 px-5 py-3.5 border-b border-border last:border-0 items-center hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold overflow-hidden">
                  {c.avatarPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/avatar/${c.id}`}
                      alt={c.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    c.fullName.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 truncate">
                    {c.fullName}
                    {c.nickname && (
                      <span className="text-muted-foreground font-normal text-sm">
                        ({c.nickname})
                      </span>
                    )}
                    {!c.active && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        ปิด
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">@{c.username}</div>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground min-w-0">
                {c.email && <span className="truncate">{c.email}</span>}
                {c.phone && <span className="truncate">{c.phone}</span>}
                {!c.email && !c.phone && <span>—</span>}
              </div>
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
