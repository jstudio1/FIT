import { format, differenceInCalendarDays } from "date-fns";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { Users, UserCheck, UtensilsCrossed } from "lucide-react";
import { db } from "@/lib/db";
import {
  users,
  bookings,
  foodLogs,
  foodComments,
  clientProfiles,
  clientTags,
  clientTagLinks,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { toDateStr, hourLabel } from "@/lib/schedule";
import { computeClientSteps } from "@/lib/profile-progress";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { CreateClientForm } from "@/components/create-client-form";
import { ClientList, type ClientListItem } from "@/components/client-list";
import { ManageTagsPanel } from "@/components/manage-tags-panel";

export const dynamic = "force-dynamic";

export default async function TrainerClientsPage() {
  const trainer = await requireRole("TRAINER");
  const today = toDateStr(new Date());

  const clients = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "CLIENT"), eq(users.trainerId, trainer.id)))
    .orderBy(users.createdAt);

  // นัดที่ "มาเทรน" ล่าสุดต่อคน
  const lastTrainedRows = await db
    .select({
      clientId: bookings.clientId,
      lastDate: sql<string>`MAX(${bookings.date})`,
    })
    .from(bookings)
    .where(
      and(eq(bookings.trainerId, trainer.id), eq(bookings.status, "COMPLETED")),
    )
    .groupBy(bookings.clientId);
  const lastTrainedMap = new Map(lastTrainedRows.map((r) => [r.clientId, r.lastDate]));

  // นัดถัดไปที่ยังไม่ถึง (เอาที่เร็วที่สุดต่อคน)
  const upcomingRows = await db
    .select({
      clientId: bookings.clientId,
      date: bookings.date,
      hour: bookings.hour,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.trainerId, trainer.id),
        eq(bookings.status, "BOOKED"),
        gte(bookings.date, today),
      ),
    )
    .orderBy(bookings.date, bookings.hour);
  const nextSessionMap = new Map<number, { date: string; hour: number }>();
  for (const r of upcomingRows) {
    if (!nextSessionMap.has(r.clientId)) {
      nextSessionMap.set(r.clientId, { date: r.date, hour: r.hour });
    }
  }

  // อาหารที่ยังไม่ได้ตรวจ ต่อคน
  const pendingFoodRows = await db
    .select({ clientId: foodLogs.clientId, c: sql<number>`count(*)` })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .leftJoin(foodComments, eq(foodComments.foodLogId, foodLogs.id))
    .where(and(eq(users.trainerId, trainer.id), isNull(foodComments.id)))
    .groupBy(foodLogs.clientId);
  const pendingFoodMap = new Map(pendingFoodRows.map((r) => [r.clientId, Number(r.c)]));

  // สถานะการตั้งค่าโปรไฟล์ของลูกเทรนแต่ละคน
  const profileRows = clients.length
    ? await db
        .select()
        .from(clientProfiles)
        .where(
          inArray(
            clientProfiles.userId,
            clients.map((c) => c.id),
          ),
        )
    : [];
  const profileByClientId = new Map(profileRows.map((p) => [p.userId, p]));

  // แท็ก/กลุ่มลูกเทรนที่เทรนเนอร์สร้างเอง
  const allTags = await db
    .select()
    .from(clientTags)
    .where(eq(clientTags.trainerId, trainer.id))
    .orderBy(clientTags.createdAt);
  const tagLinks = clients.length
    ? await db
        .select()
        .from(clientTagLinks)
        .where(
          inArray(
            clientTagLinks.clientId,
            clients.map((c) => c.id),
          ),
        )
    : [];
  const tagIdsByClient = new Map<number, number[]>();
  for (const link of tagLinks) {
    const arr = tagIdsByClient.get(link.clientId) ?? [];
    arr.push(link.tagId);
    tagIdsByClient.set(link.clientId, arr);
  }

  const now = new Date();
  const items: ClientListItem[] = clients.map((c) => {
    const lastDate = lastTrainedMap.get(c.id);
    let lastTrainedLabel: string | null = null;
    let lastTrainedSort = -Infinity;
    if (lastDate) {
      const d = new Date(`${lastDate}T00:00:00`);
      const days = differenceInCalendarDays(now, d);
      lastTrainedLabel =
        days <= 0 ? "วันนี้" : days === 1 ? "เมื่อวาน" : `${days} วันก่อน`;
      lastTrainedSort = d.getTime();
    }

    const next = nextSessionMap.get(c.id);
    const nextSessionLabel = next
      ? `${format(new Date(`${next.date}T00:00:00`), "d MMM")} ${hourLabel(next.hour)}`
      : null;

    const profile = profileByClientId.get(c.id);
    const hasHealthProfile = Boolean(profile?.goals || profile?.healthHistory);
    const steps = computeClientSteps(c, hasHealthProfile);
    const profileStepsDone = steps.filter((s) => s.done).length;

    return {
      id: c.id,
      fullName: c.fullName,
      nickname: c.nickname,
      username: c.username,
      phone: c.phone,
      email: c.email,
      active: c.active,
      avatarPath: c.avatarPath,
      createdAt: c.createdAt.toISOString(),
      lastTrainedLabel,
      lastTrainedSort,
      nextSessionLabel,
      pendingFoodCount: pendingFoodMap.get(c.id) ?? 0,
      profileStepsDone,
      profileStepsTotal: steps.length,
      tagIds: tagIdsByClient.get(c.id) ?? [],
    };
  });
  // ล่าสุดขึ้นก่อน (ค่า default ตอนโหลดหน้า)
  items.reverse();

  const activeCount = clients.filter((c) => c.active).length;
  const totalPendingFood = pendingFoodRows.reduce((sum, r) => sum + Number(r.c), 0);

  return (
    <>
      <PageHeader title="ลูกเทรน" description="ลูกเทรนของคุณและประวัติของแต่ละคน" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 mb-6">
        <StatCard label="ลูกเทรนทั้งหมด" value={clients.length} icon={Users} />
        <StatCard
          label="ใช้งานอยู่"
          value={activeCount}
          icon={UserCheck}
          hint={
            clients.length - activeCount > 0
              ? `ปิดใช้งาน ${clients.length - activeCount} คน`
              : undefined
          }
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label="อาหารรอตรวจ"
            value={totalPendingFood}
            icon={UtensilsCrossed}
            hint="รวมทุกคน"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <CreateClientForm />
        <ManageTagsPanel allTags={allTags} />
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-12 sm:py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card px-4">
          <Users className="size-7 sm:size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm sm:text-base text-muted-foreground">
            ยังไม่มีลูกเทรน — กดปุ่มเพิ่มลูกเทรนด้านบน
          </p>
        </div>
      ) : (
        <ClientList clients={items} allTags={allTags} />
      )}
    </>
  );
}
