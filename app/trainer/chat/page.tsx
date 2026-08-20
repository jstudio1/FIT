import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { users, chatMessages } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { FeatureDisabled } from "@/components/feature-disabled";
import { ChatInboxList, type ChatInboxItem } from "@/components/chat-inbox-list";

export const dynamic = "force-dynamic";

export default async function TrainerChatInboxPage() {
  const trainer = await requireRole("TRAINER");
  const settings = await getSiteSettings();

  if (!settings.chatEnabled) {
    return (
      <>
        <PageHeader title="แชท" description="คุยกับลูกเทรนของคุณ" />
        <FeatureDisabled message="ระบบแชทถูกปิดใช้งานอยู่ในขณะนี้" />
      </>
    );
  }

  const clients = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      nickname: users.nickname,
      avatarPath: users.avatarPath,
    })
    .from(users)
    .where(and(eq(users.role, "CLIENT"), eq(users.trainerId, trainer.id)));

  const lastMsgRows = await db
    .select({
      clientId: chatMessages.clientId,
      body: chatMessages.body,
      imagePath: chatMessages.imagePath,
      createdAt: chatMessages.createdAt,
      senderId: chatMessages.senderId,
    })
    .from(chatMessages)
    .where(and(eq(chatMessages.trainerId, trainer.id), isNull(chatMessages.deletedAt)))
    .orderBy(desc(chatMessages.createdAt));
  const lastMsgByClient = new Map<number, (typeof lastMsgRows)[number]>();
  for (const m of lastMsgRows) {
    if (!lastMsgByClient.has(m.clientId)) lastMsgByClient.set(m.clientId, m);
  }

  const unreadRows = await db
    .select({ clientId: chatMessages.clientId, c: sql<number>`count(*)` })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.trainerId, trainer.id),
        isNull(chatMessages.readByTrainerAt),
        isNull(chatMessages.deletedAt),
      ),
    )
    .groupBy(chatMessages.clientId);
  const unreadByClient = new Map(unreadRows.map((r) => [r.clientId, Number(r.c)]));

  const items: ChatInboxItem[] = clients
    .map((c) => {
      const last = lastMsgByClient.get(c.id) ?? null;
      return {
        id: c.id,
        fullName: c.fullName,
        nickname: c.nickname,
        avatarPath: c.avatarPath,
        lastPreview: last ? (last.body ?? "ส่งรูปภาพ") : null,
        lastIsMine: last?.senderId === trainer.id,
        unread: unreadByClient.get(c.id) ?? 0,
        _sort: last?.createdAt.getTime() ?? 0,
      };
    })
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...rest }) => rest);

  return (
    <>
      <PageHeader title="แชท" description="คุยกับลูกเทรนของคุณ" />

      {items.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          <MessageCircle className="size-8 mx-auto mb-2" />
          ยังไม่มีลูกเทรน
        </div>
      ) : (
        <ChatInboxList items={items} />
      )}
    </>
  );
}
