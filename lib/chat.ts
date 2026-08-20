import "server-only";

import type { chatMessages } from "./db/schema";
import type { ChatMessageDTO } from "@/components/chat-thread";

type ChatMessageRow = typeof chatMessages.$inferSelect;

/** แปลงแถวข้อความจาก DB เป็น DTO ที่หน้าเว็บใช้ — ใช้ร่วมกันทั้งฝั่งเทรนเนอร์/ลูกเทรน/owner
 * viewerId = null หมายถึงมุมมองบุคคลที่สาม (เช่น owner ดูย้อนหลัง) — ไม่มีฝั่งไหนเป็น "mine" */
export function toChatMessageDTOs(
  rows: ChatMessageRow[],
  viewerId: number | null,
  viewerRole?: "TRAINER" | "CLIENT",
): ChatMessageDTO[] {
  return rows.map((m) => {
    const mine = viewerId != null && m.senderId === viewerId;
    const readByOther =
      mine && viewerRole
        ? !!(viewerRole === "TRAINER" ? m.readByClientAt : m.readByTrainerAt)
        : undefined;
    return {
      id: m.id,
      senderId: m.senderId,
      body: m.deletedAt ? null : m.body,
      hasImage: !m.deletedAt && !!m.imagePath,
      deleted: !!m.deletedAt,
      createdAt: m.createdAt.toISOString(),
      mine,
      readByOther,
    };
  });
}
