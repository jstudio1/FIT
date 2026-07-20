"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
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
  password: z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร").max(128),
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
  const inserted = await db
    .insert(users)
    .values({ username, passwordHash, role: "TRAINER", fullName })
    .$returningId();

  await db
    .insert(trainerSettings)
    .values({ trainerId: inserted[0].id, bookingOpen: true });

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
    .set({ active })
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
    if (password.length < 6) return { error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };
    set.passwordHash = await hashPassword(password);
  }

  await db
    .update(users)
    .set(set)
    .where(and(eq(users.id, id), eq(users.role, "TRAINER")));

  revalidatePath(`/owner/trainers/${id}`);
  revalidatePath("/owner/trainers");
  return {
    success: password ? "บันทึกและรีเซ็ตรหัสผ่านแล้ว" : "บันทึกข้อมูลแล้ว",
  };
}

/* ---------------- Broadcast แจ้งเตือนถึงเทรนเนอร์ทุกคน ---------------- */
export async function broadcastToTrainersAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("OWNER");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const activeOnly = formData.get("activeOnly") === "on";

  if (title.length < 1 || title.length > 191)
    return { error: "กรุณากรอกหัวข้อ" };
  if (message.length > 1000) return { error: "ข้อความยาวเกินไป" };

  const trainers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      activeOnly
        ? and(eq(users.role, "TRAINER"), eq(users.active, true))
        : eq(users.role, "TRAINER"),
    );

  if (trainers.length === 0) return { error: "ยังไม่มีเทรนเนอร์ในระบบ" };

  await db.insert(notifications).values(
    trainers.map((t) => ({
      userId: t.id,
      type: "broadcast",
      title,
      message: message || null,
    })),
  );

  return { success: `ส่งประกาศถึงเทรนเนอร์ ${trainers.length} คนแล้ว` };
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
