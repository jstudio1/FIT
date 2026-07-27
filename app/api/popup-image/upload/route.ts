import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { deletePopupImage, savePopupImage } from "@/lib/upload";
import { writeAudit } from "@/lib/audit";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: NextRequest) {
  const owner = await requireRole("OWNER");

  const form = await req.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์รูป" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "ต้องเป็นไฟล์รูปภาพ" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "รูปใหญ่เกิน 8MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let popupImagePath: string;
  try {
    popupImagePath = await savePopupImage(buffer);
  } catch {
    return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ" }, { status: 500 });
  }

  const [existing] = await db
    .select({ popupImagePath: siteSettings.popupImagePath })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  if (existing) {
    await db.update(siteSettings).set({ popupImagePath }).where(eq(siteSettings.id, 1));
  } else {
    await db.insert(siteSettings).values({ id: 1, popupImagePath });
  }
  if (existing?.popupImagePath) await deletePopupImage(existing.popupImagePath);

  await writeAudit({
    actorId: owner.id,
    action: "POPUP_IMAGE_UPDATED",
    resourceType: "SITE_SETTINGS",
  });

  return NextResponse.json({ ok: true });
}
