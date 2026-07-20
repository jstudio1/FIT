import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, type User } from "./db/schema";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
} from "./session";

/** อ่าน user ปัจจุบันจาก cookie (ตรวจกับ DB ให้ role/active สดเสมอ) */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.uid))
    .limit(1);
  const user = rows[0];
  if (!user || !user.active) return null;
  return user;
}

/** ตั้ง cookie session หลัง login สำเร็จ */
export async function createSession(user: User): Promise<void> {
  const token = await signSession({
    uid: user.id,
    role: user.role,
    username: user.username,
    name: user.fullName,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
