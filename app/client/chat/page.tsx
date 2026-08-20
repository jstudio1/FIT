import { and, asc, eq } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { users, chatMessages } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { ChatThread } from "@/components/chat-thread";
import { FeatureDisabled } from "@/components/feature-disabled";
import { toChatMessageDTOs } from "@/lib/chat";

export const dynamic = "force-dynamic";

export default async function ClientChatPage() {
  const client = await requireRole("CLIENT");
  const settings = await getSiteSettings();

  if (!settings.chatEnabled) {
    return (
      <>
        <PageHeader title="แชท" description="คุยกับเทรนเนอร์ของคุณ" />
        <FeatureDisabled message="ระบบแชทถูกปิดใช้งานอยู่ในขณะนี้" />
      </>
    );
  }

  if (!client.trainerId) {
    return (
      <>
        <PageHeader title="แชท" description="คุยกับเทรนเนอร์ของคุณ" />
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          <MessageCircle className="size-8 mx-auto mb-2" />
          ยังไม่มีเทรนเนอร์ดูแลบัญชีนี้
        </div>
      </>
    );
  }

  const [trainer] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, client.trainerId), eq(users.role, "TRAINER")))
    .limit(1);

  if (!trainer) {
    return (
      <>
        <PageHeader title="แชท" description="คุยกับเทรนเนอร์ของคุณ" />
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          <MessageCircle className="size-8 mx-auto mb-2" />
          ไม่พบเทรนเนอร์
        </div>
      </>
    );
  }

  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.trainerId, trainer.id),
        eq(chatMessages.clientId, client.id),
      ),
    )
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  const initialMessages = toChatMessageDTOs(rows, client.id, "CLIENT");

  return (
    <>
      <PageHeader title="แชท" description={`คุยกับ ${trainer.fullName}`} />
      <ChatThread
        clientId={client.id}
        otherPartyName={trainer.fullName}
        otherPartyUserId={trainer.id}
        otherPartyAvatarPath={trainer.avatarPath}
        initialMessages={initialMessages}
        deleteWindowMin={settings.chatDeleteWindowMin}
        maxMessageLength={settings.chatMaxMessageLength}
      />
    </>
  );
}
