import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodLogs, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { readFoodImage } from "@/lib/upload";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const logId = Number(id);
  if (!Number.isFinite(logId))
    return new NextResponse("Bad request", { status: 400 });

  const [log] = await db
    .select({
      imagePath: foodLogs.imagePath,
      clientId: foodLogs.clientId,
      trainerId: users.trainerId,
    })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .where(eq(foodLogs.id, logId))
    .limit(1);
  if (!log) return new NextResponse("Not found", { status: 404 });

  // เช็คสิทธิ์: เจ้าของรูป / เทรนเนอร์ของเจ้าของรูป / เจ้าของระบบ
  const allowed =
    user.role === "OWNER" ||
    (user.role === "CLIENT" && user.id === log.clientId) ||
    (user.role === "TRAINER" && user.id === log.trainerId);
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const buffer = await readFoodImage(log.imagePath);
  if (!buffer) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
