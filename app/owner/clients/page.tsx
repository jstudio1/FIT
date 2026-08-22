import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { UsersRound } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { OwnerClientList, type OwnerClientRow } from "@/components/owner-client-list";

export const dynamic = "force-dynamic";

export default async function OwnerAllClientsPage() {
  await requireRole("OWNER");

  const trainerU = alias(users, "trainer");
  const clients: OwnerClientRow[] = await db
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
        <OwnerClientList clients={clients} />
      )}
    </>
  );
}
