import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { users, chatMessages } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { ChatThread } from "@/components/chat-thread";
import { FeatureDisabled } from "@/components/feature-disabled";
import { toChatMessageDTOs } from "@/lib/chat";

export const dynamic = "force-dynamic";

export default async function TrainerChatThreadPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const clientIdNum = Number(clientId);
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

  const [client] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, clientIdNum),
        eq(users.role, "CLIENT"),
        eq(users.trainerId, trainer.id),
      ),
    )
    .limit(1);
  if (!client) notFound();

  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.trainerId, trainer.id),
        eq(chatMessages.clientId, clientIdNum),
      ),
    )
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  const initialMessages = toChatMessageDTOs(rows, trainer.id, "TRAINER");

  return (
    <>
      <Link
        href="/trainer/chat"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้าแชท
      </Link>
      <PageHeader title={client.fullName} description={`@${client.username}`} />
      <ChatThread
        clientId={clientIdNum}
        otherPartyName={client.fullName}
        otherPartyUserId={client.id}
        otherPartyAvatarPath={client.avatarPath}
        initialMessages={initialMessages}
        deleteWindowMin={settings.chatDeleteWindowMin}
        maxMessageLength={settings.chatMaxMessageLength}
      />
    </>
  );
}
