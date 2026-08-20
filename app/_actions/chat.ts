"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, notifications, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { getSiteSettings } from "@/lib/settings";
import { deleteChatImage } from "@/lib/upload";
import type { User } from "@/lib/db/schema";

export type Res = { error?: string; success?: string };

/** เช็คสิทธิ์เข้าถึงบทสนทนา — trainer เข้าได้เฉพาะลูกเทรนตัวเอง, client เข้าได้เฉพาะของตัวเอง คืน { trainerId, clientId } ถ้าผ่าน */
export async function resolveConversation(
  user: User,
  clientId: number,
): Promise<{ trainerId: number; clientId: number } | null> {
  if (user.role === "CLIENT") {
    if (user.id !== clientId) return null;
    if (!user.trainerId) return null;
    return { trainerId: user.trainerId, clientId };
  }
  if (user.role === "TRAINER") {
    const [client] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, clientId),
          eq(users.role, "CLIENT"),
          eq(users.trainerId, user.id),
        ),
      )
      .limit(1);
    if (!client) return null;
    return { trainerId: user.id, clientId };
  }
  return null; // OWNER ไม่มีสิทธิ์ส่ง/มาร์กอ่าน — ใช้ resolveConversationForOwner สำหรับดูอย่างเดียวแทน
}

/** เจ้าของระบบดูบทสนทนาคู่ไหนก็ได้ (อ่านอย่างเดียวเพื่อตรวจสอบ) — แยกจาก resolveConversation ที่ใช้จำกัดสิทธิ์ส่ง/มาร์กอ่าน */
export async function resolveConversationForOwner(
  clientId: number,
): Promise<{ trainerId: number; clientId: number } | null> {
  const [client] = await db
    .select({ id: users.id, trainerId: users.trainerId })
    .from(users)
    .where(and(eq(users.id, clientId), eq(users.role, "CLIENT")))
    .limit(1);
  if (!client || !client.trainerId) return null;
  return { trainerId: client.trainerId, clientId };
}

export async function sendChatMessageAction(
  clientId: number,
  body: string,
): Promise<Res> {
  const settings = await getSiteSettings();
  if (!settings.chatEnabled) return { error: "ระบบแชทถูกปิดใช้งานอยู่ในขณะนี้" };

  const user = await requireUser();
  const conv = await resolveConversation(user, clientId);
  if (!conv) return { error: "ไม่มีสิทธิ์ส่งข้อความในบทสนทนานี้" };

  const trimmed = body.trim();
  if (!trimmed) return { error: "กรุณากรอกข้อความ" };
  if (trimmed.length > settings.chatMaxMessageLength)
    return { error: `ข้อความยาวเกิน ${settings.chatMaxMessageLength} ตัวอักษร` };

  const now = new Date();
  await db.insert(chatMessages).values({
    trainerId: conv.trainerId,
    clientId: conv.clientId,
    senderId: user.id,
    body: trimmed,
    // ผู้ส่งอ่านข้อความของตัวเองแล้วโดยอัตโนมัติ
    readByTrainerAt: user.role === "TRAINER" ? now : null,
    readByClientAt: user.role === "CLIENT" ? now : null,
  });

  const recipientId = user.role === "TRAINER" ? conv.clientId : conv.trainerId;
  await db.insert(notifications).values({
    userId: recipientId,
    type: "chat",
    title: `ข้อความใหม่จาก${user.role === "TRAINER" ? "เทรนเนอร์" : "ลูกเทรน"} ${user.fullName}`,
    message: trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed,
  });

  await writeAudit({
    actorId: user.id,
    action: "CHAT_MESSAGE_SENT",
    resourceType: "CHAT",
    subjectUserId: recipientId,
  });

  revalidatePath(`/trainer/chat/${conv.clientId}`);
  revalidatePath("/trainer/chat");
  revalidatePath("/client/chat");
  return { success: "ส่งข้อความแล้ว" };
}

export async function markChatReadAction(clientId: number): Promise<Res> {
  const user = await requireUser();
  const conv = await resolveConversation(user, clientId);
  if (!conv) return { error: "ไม่มีสิทธิ์เข้าถึงบทสนทนานี้" };

  const now = new Date();
  await db
    .update(chatMessages)
    .set(
      user.role === "TRAINER" ? { readByTrainerAt: now } : { readByClientAt: now },
    )
    .where(
      and(
        eq(chatMessages.trainerId, conv.trainerId),
        eq(chatMessages.clientId, conv.clientId),
      ),
    );

  return { success: "อ่านแล้ว" };
}

/** ลบข้อความของตัวเอง — ลบได้เฉพาะภายในเวลาที่เจ้าของระบบกำหนด (siteSettings.chatDeleteWindowMin) หลังส่ง */
export async function deleteChatMessageAction(messageId: number): Promise<Res> {
  const user = await requireUser();
  const { chatDeleteWindowMin } = await getSiteSettings();

  const [msg] = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .limit(1);
  if (!msg) return { error: "ไม่พบข้อความนี้" };
  if (msg.senderId !== user.id) return { error: "ลบได้เฉพาะข้อความของตัวเอง" };
  if (msg.deletedAt) return { success: "ลบไปแล้ว" };
  if (Date.now() - msg.createdAt.getTime() > chatDeleteWindowMin * 60 * 1000) {
    return { error: `ลบได้เฉพาะภายใน ${chatDeleteWindowMin} นาทีหลังส่งเท่านั้น` };
  }

  await db
    .update(chatMessages)
    .set({ deletedAt: new Date() })
    .where(eq(chatMessages.id, messageId));
  if (msg.imagePath) await deleteChatImage(msg.imagePath);

  await writeAudit({
    actorId: user.id,
    action: "CHAT_MESSAGE_DELETED",
    resourceType: "CHAT",
    resourceId: messageId,
  });

  revalidatePath(`/trainer/chat/${msg.clientId}`);
  revalidatePath("/client/chat");
  return { success: "ลบข้อความแล้ว" };
}
