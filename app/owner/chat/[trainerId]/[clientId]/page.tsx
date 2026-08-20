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
import { toChatMessageDTOs } from "@/lib/chat";

export const dynamic = "force-dynamic";

export default async function OwnerChatThreadPage({
  params,
}: {
  params: Promise<{ trainerId: string; clientId: string }>;
}) {
  const { trainerId, clientId } = await params;
  const trainerIdNum = Number(trainerId);
  const clientIdNum = Number(clientId);
  await requireRole("OWNER");
  const settings = await getSiteSettings();

  const [trainer] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, trainerIdNum), eq(users.role, "TRAINER")))
    .limit(1);
  const [client] = await db
    .select()
    .from(users)
    .where(
      and(eq(users.id, clientIdNum), eq(users.role, "CLIENT"), eq(users.trainerId, trainerIdNum)),
    )
    .limit(1);
  if (!trainer || !client) notFound();

  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.trainerId, trainerIdNum), eq(chatMessages.clientId, clientIdNum)))
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  // มุมมองจากฝั่งเทรนเนอร์ (ข้อความของเทรนเนอร์อยู่ขวา) เพื่อให้ดูสถานะ "อ่านแล้ว" ของฝั่งลูกเทรนได้
  const initialMessages = toChatMessageDTOs(rows, trainer.id, "TRAINER");

  return (
    <>
      <Link
        href="/owner/chat"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้าตรวจสอบแชท
      </Link>
      <PageHeader
        title={`${trainer.fullName} ↔ ${client.fullName}`}
        description="มุมมองอ่านอย่างเดียวสำหรับเจ้าของระบบ"
      />
      <ChatThread
        clientId={clientIdNum}
        otherPartyName={client.fullName}
        otherPartyUserId={client.id}
        otherPartyAvatarPath={client.avatarPath}
        initialMessages={initialMessages}
        deleteWindowMin={settings.chatDeleteWindowMin}
        maxMessageLength={settings.chatMaxMessageLength}
        readOnly
      />
    </>
  );
}
