import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { readAvatarImage } from "@/lib/upload";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const viewer = await getSessionUser();
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });

  const { userId } = await params;
  const targetId = Number(userId);
  if (!Number.isFinite(targetId))
    return new NextResponse("Bad request", { status: 400 });

  const [target] = await db
    .select({
      id: users.id,
      trainerId: users.trainerId,
      avatarPath: users.avatarPath,
    })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!target) return new NextResponse("Not found", { status: 404 });

  // เช็คสิทธิ์: เจ้าของรูป / เจ้าของระบบ / เทรนเนอร์-ลูกเทรนของกันและกัน
  const allowed =
    viewer.id === target.id ||
    viewer.role === "OWNER" ||
    (viewer.role === "TRAINER" && target.trainerId === viewer.id) ||
    (viewer.role === "CLIENT" && viewer.trainerId === target.id);
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  if (!target.avatarPath) return new NextResponse("Not found", { status: 404 });
  const buffer = await readAvatarImage(target.avatarPath);
  if (!buffer) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
