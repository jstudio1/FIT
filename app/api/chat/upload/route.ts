import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, notifications } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { saveChatImage } from "@/lib/upload";
import { writeAudit } from "@/lib/audit";
import { resolveConversation } from "@/app/_actions/chat";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const settings = await getSiteSettings();
  if (!settings.chatEnabled) {
    return NextResponse.json({ error: "ระบบแชทถูกปิดใช้งานอยู่ในขณะนี้" }, { status: 403 });
  }

  const form = await req.formData();
  const clientId = Number(form.get("clientId"));
  const file = form.get("image");
  const caption = String(form.get("caption") ?? "").trim();

  if (!Number.isFinite(clientId)) {
    return NextResponse.json({ error: "ไม่พบบทสนทนา" }, { status: 400 });
  }
  const conv = await resolveConversation(user, clientId);
  if (!conv) return NextResponse.json({ error: "ไม่มีสิทธิ์ส่งข้อความในบทสนทนานี้" }, { status: 403 });

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์รูป" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "ต้องเป็นไฟล์รูปภาพ" }, { status: 400 });
  }
  if (file.size > settings.maxUploadSizeMb * 1024 * 1024) {
    return NextResponse.json(
      { error: `รูปใหญ่เกิน ${settings.maxUploadSizeMb}MB` },
      { status: 400 },
    );
  }
  if (caption.length > settings.chatMaxMessageLength) {
    return NextResponse.json({ error: "ข้อความยาวเกินไป" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let imagePath: string;
  try {
    imagePath = await saveChatImage(buffer);
  } catch {
    return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ" }, { status: 500 });
  }

  const now = new Date();
  await db.insert(chatMessages).values({
    trainerId: conv.trainerId,
    clientId: conv.clientId,
    senderId: user.id,
    body: caption || null,
    imagePath,
    readByTrainerAt: user.role === "TRAINER" ? now : null,
    readByClientAt: user.role === "CLIENT" ? now : null,
  });

  const recipientId = user.role === "TRAINER" ? conv.clientId : conv.trainerId;
  await db.insert(notifications).values({
    userId: recipientId,
    type: "chat",
    title: `ข้อความใหม่จาก${user.role === "TRAINER" ? "เทรนเนอร์" : "ลูกเทรน"} ${user.fullName}`,
    message: "ส่งรูปภาพมาให้คุณ",
  });

  await writeAudit({
    actorId: user.id,
    action: "CHAT_IMAGE_SENT",
    resourceType: "CHAT",
    subjectUserId: recipientId,
  });

  return NextResponse.json({ ok: true });
}
