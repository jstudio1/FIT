import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { deleteAvatarImage, saveAvatarImage } from "@/lib/upload";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 401 });
  const { maxUploadSizeMb } = await getSiteSettings();

  const form = await req.formData();
  const file = form.get("avatar");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์รูป" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "ต้องเป็นไฟล์รูปภาพ" }, { status: 400 });
  }
  if (file.size > maxUploadSizeMb * 1024 * 1024) {
    return NextResponse.json({ error: `รูปใหญ่เกิน ${maxUploadSizeMb}MB` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let avatarPath: string;
  try {
    avatarPath = await saveAvatarImage(buffer);
  } catch {
    return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ" }, { status: 500 });
  }

  const oldPath = user.avatarPath;
  await db.update(users).set({ avatarPath }).where(eq(users.id, user.id));
  if (oldPath) await deleteAvatarImage(oldPath);

  await writeAudit({
    actorId: user.id,
    action: "AVATAR_UPDATED",
    resourceType: "USER",
    subjectUserId: user.id,
  });

  return NextResponse.json({ ok: true });
}
