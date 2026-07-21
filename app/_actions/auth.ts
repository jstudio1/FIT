"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/auth";
import { homeFor } from "@/lib/session";
import { checkLoginLimit, loginKeys, recordLoginAttempt } from "@/lib/login-rate-limit";
import { writeAudit } from "@/lib/audit";

export type LoginState = { error?: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
  }

  const keys = await loginKeys(username);
  const limit = await checkLoginLimit(keys);
  if (limit.blocked) {
    await writeAudit({ action: "LOGIN_BLOCKED", resourceType: "AUTH", metadata: { retryAfterSeconds: limit.retryAfterSeconds } });
    return { error: `ลองเข้าสู่ระบบมากเกินไป กรุณารอ ${Math.ceil(limit.retryAfterSeconds / 60)} นาที` };
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  const user = rows[0];

  if (!user || !user.active) {
    await recordLoginAttempt(keys, false);
    await writeAudit({ action: "LOGIN_FAILED", resourceType: "AUTH" });
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await recordLoginAttempt(keys, false);
    await writeAudit({ actorId: user.id, action: "LOGIN_FAILED", resourceType: "AUTH", subjectUserId: user.id });
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  await recordLoginAttempt(keys, true);
  await writeAudit({ actorId: user.id, action: "LOGIN_SUCCESS", resourceType: "AUTH", subjectUserId: user.id });
  await createSession(user);
  redirect(homeFor(user.role));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
