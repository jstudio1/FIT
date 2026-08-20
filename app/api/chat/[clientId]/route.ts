import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { resolveConversation, resolveConversationForOwner } from "@/app/_actions/chat";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({ messages: [] }, { status: 401 });

  const { clientId: clientIdStr } = await params;
  const clientId = Number(clientIdStr);
  if (!Number.isFinite(clientId))
    return NextResponse.json({ messages: [] }, { status: 400 });

  const isOwner = viewer.role === "OWNER";
  const conv = isOwner
    ? await resolveConversationForOwner(clientId)
    : await resolveConversation(viewer, clientId);
  if (!conv) return NextResponse.json({ messages: [] }, { status: 403 });

  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.trainerId, conv.trainerId),
        eq(chatMessages.clientId, conv.clientId),
      ),
    )
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  return NextResponse.json({
    // มุมมองของเจ้าของระบบ: อิงจากฝั่งเทรนเนอร์เสมอ (ข้อความเทรนเนอร์ = "mine") เพื่อให้สอดคล้องกับตอนโหลดหน้าแรก
    messages: rows.map((m) => {
      const mine = isOwner ? m.senderId === conv.trainerId : m.senderId === viewer.id;
      const readByOther = isOwner
        ? m.readByClientAt
        : viewer.role === "TRAINER"
          ? m.readByClientAt
          : m.readByTrainerAt;
      return {
        id: m.id,
        senderId: m.senderId,
        body: m.deletedAt ? null : m.body,
        hasImage: !m.deletedAt && !!m.imagePath,
        deleted: !!m.deletedAt,
        createdAt: m.createdAt,
        mine,
        readByOther: mine ? !!readByOther : undefined,
      };
    }),
  });
}
