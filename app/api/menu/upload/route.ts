import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { deleteMenuImage, saveMenuImage } from "@/lib/upload";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const owner = await requireRole("OWNER");
  const { maxUploadSizeMb } = await getSiteSettings();

  const form = await req.formData();
  const id = Number(form.get("id"));
  const file = form.get("image");

  if (!Number.isFinite(id)) return NextResponse.json({ error: "ไม่พบเมนู" }, { status: 400 });
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์รูป" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "ต้องเป็นไฟล์รูปภาพ" }, { status: 400 });
  }
  if (file.size > maxUploadSizeMb * 1024 * 1024) {
    return NextResponse.json({ error: `รูปใหญ่เกิน ${maxUploadSizeMb}MB` }, { status: 400 });
  }

  const [existing] = await db
    .select({ imagePath: menuItems.imagePath })
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "ไม่พบเมนู" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let imagePath: string;
  try {
    imagePath = await saveMenuImage(buffer);
  } catch {
    return NextResponse.json({ error: "บันทึกรูปไม่สำเร็จ" }, { status: 500 });
  }

  await db
    .update(menuItems)
    .set({ imagePath, imageCredit: null }) // อัปโหลดเอง ไม่ใช่จาก Pexels แล้ว เลยไม่มีเครดิต
    .where(eq(menuItems.id, id));
  if (existing.imagePath) await deleteMenuImage(existing.imagePath);

  await writeAudit({
    actorId: owner.id,
    action: "MENU_IMAGE_UPLOADED",
    resourceType: "MENU_ITEM",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
