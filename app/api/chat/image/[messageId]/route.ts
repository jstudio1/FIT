import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { readChatImage } from "@/lib/upload";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { messageId } = await params;
  const id = Number(messageId);
  if (!Number.isFinite(id)) return new NextResponse("Bad request", { status: 400 });

  const [msg] = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
  if (!msg || !msg.imagePath || msg.deletedAt) return new NextResponse("Not found", { status: 404 });

  // เข้าถึงได้เฉพาะคู่สนทนา (เทรนเนอร์-ลูกเทรนคู่นั้น) หรือ owner
  const allowed =
    user.role === "OWNER" ||
    (user.role === "TRAINER" && user.id === msg.trainerId) ||
    (user.role === "CLIENT" && user.id === msg.clientId);
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const buffer = await readChatImage(msg.imagePath);
  if (!buffer) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
