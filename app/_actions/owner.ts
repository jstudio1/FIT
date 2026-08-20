"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  users,
  trainerSettings,
  siteSettings,
  notifications,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/authz";

export type ActionState = { error?: string; success?: string } | null;

const createTrainerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "ชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร")
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "ใช้ได้เฉพาะ a-z, 0-9, . _ -"),
  password: z.string().min(12, "รหัสผ่านอย่างน้อย 12 ตัวอักษร").max(128),
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อ-นามสกุล").max(128),
});

export async function createTrainerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("OWNER");

  const parsed = createTrainerSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { username, password, fullName } = parsed.data;

  const dup = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (dup[0]) {
    return { error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" };
  }

  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({ username, passwordHash, role: "TRAINER", fullName })
      .$returningId();
    await tx
      .insert(trainerSettings)
      .values({ trainerId: inserted[0].id, bookingOpen: true });
  });

  revalidatePath("/owner/trainers");
  revalidatePath("/owner");
  return { success: `สร้างบัญชีเทรนเนอร์ "${fullName}" สำเร็จ` };
}

export async function setTrainerActiveAction(formData: FormData): Promise<void> {
  await requireRole("OWNER");
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!Number.isFinite(id)) return;
  await db
    .update(users)
    .set(active ? { active } : { active, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(and(eq(users.id, id), eq(users.role, "TRAINER")));
  revalidatePath("/owner/trainers");
}

/* ---------------- แก้ไขข้อมูลเทรนเนอร์ ---------------- */
export async function updateTrainerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("OWNER");
  const id = Number(formData.get("id"));
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!Number.isFinite(id)) return { error: "ไม่พบเทรนเนอร์" };
  if (fullName.length < 1 || fullName.length > 128)
    return { error: "กรุณากรอกชื่อ-นามสกุล" };

  const set: { fullName: string; passwordHash?: string } = { fullName };
  if (password) {
    if (password.length < 12) return { error: "รหัสผ่านอย่างน้อย 12 ตัวอักษร" };
    set.passwordHash = await hashPassword(password);
  }

  await db
    .update(users)
    .set(password ? { ...set, sessionVersion: sql`${users.sessionVersion} + 1` } : set)
    .where(and(eq(users.id, id), eq(users.role, "TRAINER")));

  revalidatePath(`/owner/trainers/${id}`);
  revalidatePath("/owner/trainers");
  return {
    success: password ? "บันทึกและรีเซ็ตรหัสผ่านแล้ว" : "บันทึกข้อมูลแล้ว",
  };
}

/* ---------------- Broadcast แจ้งเตือนถึงเทรนเนอร์/ลูกเทรน (ทั้งหมดหรือเลือกรายคน) ---------------- */
export async function broadcastAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("OWNER");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const activeOnly = formData.get("activeOnly") === "on";
  const targetRole = String(formData.get("targetRole") ?? "");
  const mode = String(formData.get("mode") ?? "ALL");

  if (title.length < 1 || title.length > 191)
    return { error: "กรุณากรอกหัวข้อ" };
  if (message.length > 1000) return { error: "ข้อความยาวเกินไป" };
  if (targetRole !== "TRAINER" && targetRole !== "CLIENT")
    return { error: "กรุณาเลือกกลุ่มผู้รับ" };

  const conditions = [eq(users.role, targetRole)];
  if (activeOnly) conditions.push(eq(users.active, true));

  if (mode === "SPECIFIC") {
    const ids = formData
      .getAll("userIds")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) return { error: "เลือกผู้รับอย่างน้อย 1 คน" };
    conditions.push(inArray(users.id, ids));
  }

  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions));

  if (recipients.length === 0) return { error: "ไม่พบผู้รับตามเงื่อนไขที่เลือก" };

  await db.insert(notifications).values(
    recipients.map((r) => ({
      userId: r.id,
      type: "broadcast",
      title,
      message: message || null,
    })),
  );

  const roleLabel = targetRole === "TRAINER" ? "เทรนเนอร์" : "ลูกเทรน";
  return { success: `ส่งประกาศถึง${roleLabel} ${recipients.length} คนแล้ว` };
}

/* ---------------- บันทึกตั้งค่าเว็บ/SEO ---------------- */
export async function saveSiteSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("OWNER");
  const data = {
    siteName: String(formData.get("siteName") ?? "").trim() || "Trainner",
    metaTitle: String(formData.get("metaTitle") ?? "").trim() || "Trainner",
    metaDescription: String(formData.get("metaDescription") ?? "").trim(),
    keywords: String(formData.get("keywords") ?? "").trim() || null,
    contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
  };

  const [existing] = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  if (existing) {
    await db.update(siteSettings).set(data).where(eq(siteSettings.id, 1));
  } else {
    await db.insert(siteSettings).values({ id: 1, ...data });
  }

  revalidatePath("/", "layout");
  return { success: "บันทึกการตั้งค่าเว็บไซต์แล้ว" };
}

/* ---------------- ตั้งค่าป็อปอัพประกาศ ---------------- */
export async function savePopupSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("OWNER");
  const popupEnabled = formData.get("popupEnabled") === "on";
  const popupTitle = String(formData.get("popupTitle") ?? "").trim() || null;
  const popupLinkUrl = String(formData.get("popupLinkUrl") ?? "").trim() || null;

  if (popupTitle && popupTitle.length > 191) return { error: "หัวข้อยาวเกินไป" };
  if (popupLinkUrl && popupLinkUrl.length > 500) return { error: "ลิงก์ยาวเกินไป" };
  if (popupLinkUrl && !/^https?:\/\//.test(popupLinkUrl))
    return { error: "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://" };

  const [existing] = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  const data = { popupEnabled, popupTitle, popupLinkUrl };
  if (existing) {
    await db.update(siteSettings).set(data).where(eq(siteSettings.id, 1));
  } else {
    await db.insert(siteSettings).values({ id: 1, ...data });
  }

  revalidatePath("/", "layout");
  return { success: "บันทึกการตั้งค่าป็อปอัพแล้ว" };
}

/* ---------------- เปิด/ปิดระบบแชท + แต้มสะสม, ตั้งค่าแต้ม ---------------- */
export async function saveSystemTogglesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("OWNER");

  const chatEnabled = formData.get("chatEnabled") === "on";
  const gamificationEnabled = formData.get("gamificationEnabled") === "on";
  const pointsTrainingCompleted = Number(formData.get("pointsTrainingCompleted"));
  const pointsFoodLogged = Number(formData.get("pointsFoodLogged"));
  const pointsBadgeBonus = Number(formData.get("pointsBadgeBonus"));

  if (
    !Number.isFinite(pointsTrainingCompleted) ||
    !Number.isFinite(pointsFoodLogged) ||
    !Number.isFinite(pointsBadgeBonus) ||
    pointsTrainingCompleted < 0 ||
    pointsFoodLogged < 0 ||
    pointsBadgeBonus < 0
  ) {
    return { error: "ค่าแต้มต้องเป็นตัวเลขไม่ติดลบ" };
  }

  const data = {
    chatEnabled,
    gamificationEnabled,
    pointsTrainingCompleted: Math.round(pointsTrainingCompleted),
    pointsFoodLogged: Math.round(pointsFoodLogged),
    pointsBadgeBonus: Math.round(pointsBadgeBonus),
  };

  const [existing] = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  if (existing) {
    await db.update(siteSettings).set(data).where(eq(siteSettings.id, 1));
  } else {
    await db.insert(siteSettings).values({ id: 1, ...data });
  }

  revalidatePath("/", "layout");
  return { success: "บันทึกการตั้งค่าระบบแล้ว" };
}

/* ---------------- ค่าดำเนินงาน: การจอง/เทรน, แชท, ไฟล์อัปโหลด ---------------- */
export async function saveOperationalSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("OWNER");

  const bookingCancelWindowHours = Number(formData.get("bookingCancelWindowHours"));
  const sessionDurationMin = Number(formData.get("sessionDurationMin"));
  const chatMaxMessageLength = Number(formData.get("chatMaxMessageLength"));
  const chatDeleteWindowMin = Number(formData.get("chatDeleteWindowMin"));
  const maxUploadSizeMb = Number(formData.get("maxUploadSizeMb"));

  const fields = {
    bookingCancelWindowHours,
    sessionDurationMin,
    chatMaxMessageLength,
    chatDeleteWindowMin,
    maxUploadSizeMb,
  };
  for (const v of Object.values(fields)) {
    if (!Number.isFinite(v) || v <= 0) return { error: "ค่าที่กรอกต้องเป็นตัวเลขมากกว่า 0" };
  }
  if (bookingCancelWindowHours > 168) return { error: "ชั่วโมงยกเลิกนัดล่วงหน้าต้องไม่เกิน 168 (7 วัน)" };
  if (sessionDurationMin > 480) return { error: "ความยาวคาบเทรนต้องไม่เกิน 480 นาที" };
  if (chatMaxMessageLength > 10000) return { error: "ความยาวข้อความสูงสุดต้องไม่เกิน 10,000 ตัวอักษร" };
  if (chatDeleteWindowMin > 1440) return { error: "เวลาลบข้อความต้องไม่เกิน 1,440 นาที (24 ชม.)" };
  if (maxUploadSizeMb > 50) return { error: "ขนาดไฟล์อัปโหลดสูงสุดต้องไม่เกิน 50MB" };

  const data = {
    bookingCancelWindowHours: Math.round(bookingCancelWindowHours),
    sessionDurationMin: Math.round(sessionDurationMin),
    chatMaxMessageLength: Math.round(chatMaxMessageLength),
    chatDeleteWindowMin: Math.round(chatDeleteWindowMin),
    maxUploadSizeMb: Math.round(maxUploadSizeMb),
  };

  const [existing] = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  if (existing) {
    await db.update(siteSettings).set(data).where(eq(siteSettings.id, 1));
  } else {
    await db.insert(siteSettings).values({ id: 1, ...data });
  }

  revalidatePath("/", "layout");
  return { success: "บันทึกค่าดำเนินงานแล้ว" };
}
