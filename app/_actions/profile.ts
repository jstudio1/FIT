"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/authz";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { homeFor } from "@/lib/session";

export type Res = { error?: string; success?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function updateMyProfileAction(
  _prev: Res | null,
  formData: FormData,
): Promise<Res> {
  const user = await requireUser();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const nickname = trimOrNull(formData.get("nickname"));
  const bio = trimOrNull(formData.get("bio"));
  const email = trimOrNull(formData.get("email"));
  const phone = trimOrNull(formData.get("phone"));

  if (fullName.length < 1 || fullName.length > 128) {
    return { error: "กรุณากรอกชื่อ-นามสกุล" };
  }
  if (nickname && nickname.length > 64) {
    return { error: "ชื่อเล่นยาวเกินไป" };
  }
  if (email && !EMAIL_RE.test(email)) {
    return { error: "รูปแบบอีเมลไม่ถูกต้อง" };
  }
  if (phone && !/^[0-9+\-\s()]{6,32}$/.test(phone)) {
    return { error: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" };
  }
  if (bio && bio.length > 1000) {
    return { error: "คำแนะนำตัวยาวเกิน 1,000 ตัวอักษร" };
  }

  await db
    .update(users)
    .set({ fullName, nickname, bio, email, phone })
    .where(eq(users.id, user.id));

  await writeAudit({
    actorId: user.id,
    action: "PROFILE_UPDATED",
    resourceType: "USER",
    subjectUserId: user.id,
  });

  revalidatePath(homeFor(user.role) + "/profile");
  revalidatePath(homeFor(user.role));
  return { success: "บันทึกโปรไฟล์แล้ว" };
}

export async function changeMyPasswordAction(
  _prev: Res | null,
  formData: FormData,
): Promise<Res> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) {
    return { error: "กรุณากรอกรหัสผ่านให้ครบ" };
  }
  if (newPassword.length < 12) {
    return { error: "รหัสผ่านใหม่อย่างน้อย 12 ตัวอักษร" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน" };
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };

  const passwordHash = await hashPassword(newPassword);
  const sessionVersion = user.sessionVersion + 1;
  await db
    .update(users)
    .set({ passwordHash, sessionVersion })
    .where(eq(users.id, user.id));

  // ออกคุกกี้ session ใหม่ให้ตัวเอง (sessionVersion ตรงกัน) กันไม่ให้ตัวเองหลุดออกจากระบบ
  // ส่วนอุปกรณ์/เบราว์เซอร์อื่นที่ล็อกอินค้างอยู่จะถูกบังคับออกอัตโนมัติ
  await createSession({ ...user, sessionVersion });

  await writeAudit({
    actorId: user.id,
    action: "PASSWORD_CHANGED",
    resourceType: "USER",
    subjectUserId: user.id,
  });

  return { success: "เปลี่ยนรหัสผ่านแล้ว" };
}
