import { and, desc, eq, isNull } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { users, chatMessages } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { OwnerChatInboxList, type OwnerChatInboxItem } from "@/components/owner-chat-inbox-list";

export const dynamic = "force-dynamic";

export default async function OwnerChatOversightPage() {
  await requireRole("OWNER");

  // เจ้าของระบบเห็นทุกคู่สนทนาเสมอ ไม่ว่าจะปิดสวิตช์ระบบแชทของผู้ใช้ทั่วไปหรือไม่ — ไว้ตรวจสอบย้อนหลังได้
  const trainerClientPairs = await db
    .select({
      trainerId: users.trainerId,
      clientId: users.id,
      clientName: users.fullName,
      clientNickname: users.nickname,
      clientAvatar: users.avatarPath,
    })
    .from(users)
    .where(eq(users.role, "CLIENT"));

  const trainers = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.role, "TRAINER"));
  const trainerNameById = new Map(trainers.map((t) => [t.id, t.fullName]));

  const lastMsgRows = await db
    .select({
      trainerId: chatMessages.trainerId,
      clientId: chatMessages.clientId,
      body: chatMessages.body,
      imagePath: chatMessages.imagePath,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(isNull(chatMessages.deletedAt))
    .orderBy(desc(chatMessages.createdAt));
  const lastMsgByPair = new Map<string, (typeof lastMsgRows)[number]>();
  for (const m of lastMsgRows) {
    const key = `${m.trainerId}-${m.clientId}`;
    if (!lastMsgByPair.has(key)) lastMsgByPair.set(key, m);
  }

  const items: OwnerChatInboxItem[] = trainerClientPairs
    .filter((p) => p.trainerId != null && trainerNameById.has(p.trainerId))
    .map((p) => {
      const trainerId = p.trainerId as number;
      const last = lastMsgByPair.get(`${trainerId}-${p.clientId}`) ?? null;
      return {
        trainerId,
        trainerName: trainerNameById.get(trainerId) ?? "-",
        clientId: p.clientId,
        clientName: p.clientName,
        clientNickname: p.clientNickname,
        clientAvatar: p.clientAvatar,
        lastPreview: last ? (last.body ?? "ส่งรูปภาพ") : null,
        lastAt: last?.createdAt.toISOString() ?? null,
        _sort: last?.createdAt.getTime() ?? 0,
      };
    })
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...rest }) => rest);

  return (
    <>
      <PageHeader title="ตรวจสอบแชท" description="ดูบทสนทนาระหว่างเทรนเนอร์และลูกเทรนทั้งหมด (อ่านอย่างเดียว)" />

      {items.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          <MessageCircle className="size-8 mx-auto mb-2" />
          ยังไม่มีคู่เทรนเนอร์-ลูกเทรนในระบบ
        </div>
      ) : (
        <OwnerChatInboxList items={items} />
      )}
    </>
  );
}
