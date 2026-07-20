import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import { homeFor } from "./session";
import type { Role, User } from "./db/schema";

/** ต้องล็อกอิน ไม่งั้นเด้งไป /login */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** ต้องเป็น role ที่กำหนด ไม่งั้นเด้งกลับหน้าแรกของ role ตัวเอง */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/**
 * Data isolation: เทรนเนอร์เข้าถึงได้เฉพาะลูกเทรนของตัวเอง
 * คืน trainerId ที่ควรใช้ filter query
 * - OWNER: null = เห็นได้ทุกคน (caller ต้องจัดการเอง)
 * - TRAINER: คืน id ของตัวเอง
 */
export function scopeTrainerId(user: User): number | null {
  if (user.role === "OWNER") return null;
  return user.id;
}
