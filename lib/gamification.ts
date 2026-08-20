import "server-only";

import { differenceInCalendarDays } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import {
  pointEvents,
  clientStreaks,
  clientBadges,
  bookings,
  foodLogs,
} from "./db/schema";
import { toDateStr } from "./schedule";
import { getSiteSettings } from "./settings";

export type BadgeDef = {
  code: string;
  label: string;
  description: string;
  icon: string; // ชื่อไอคอนจาก lucide-react (map ฝั่ง UI)
};

/** นิยาม badge ทั้งหมด — เรียงจากง่ายไปยาก ใช้ทั้งเช็คเงื่อนไขและแสดงผล (รวม badge ที่ยังไม่ปลดล็อก) */
export const BADGES: BadgeDef[] = [
  { code: "FIRST_SESSION", label: "ก้าวแรก", description: "มาเทรนครั้งแรกสำเร็จ", icon: "Footprints" },
  { code: "SESSIONS_10", label: "นักสู้", description: "เทรนครบ 10 ครั้ง", icon: "Dumbbell" },
  { code: "SESSIONS_50", label: "ตัวจริง", description: "เทรนครบ 50 ครั้ง", icon: "Trophy" },
  { code: "SESSIONS_100", label: "ตำนาน", description: "เทรนครบ 100 ครั้ง", icon: "Crown" },
  { code: "STREAK_3", label: "เริ่มติดลม", description: "ต่อเนื่อง 3 วัน", icon: "Flame" },
  { code: "STREAK_7", label: "หนึ่งสัปดาห์เต็ม", description: "ต่อเนื่อง 7 วัน", icon: "Flame" },
  { code: "STREAK_30", label: "หนึ่งเดือนเต็ม", description: "ต่อเนื่อง 30 วัน", icon: "Flame" },
  { code: "FOOD_FIRST", label: "เริ่มบันทึกอาหาร", description: "ส่งรูปอาหารครั้งแรก", icon: "Camera" },
  { code: "FOOD_20", label: "สายบันทึก", description: "ส่งรูปอาหารครบ 20 รูป", icon: "UtensilsCrossed" },
];
const BADGE_MAP = new Map(BADGES.map((b) => [b.code, b]));

async function ensureStreakRow(clientId: number) {
  await db
    .insert(clientStreaks)
    .values({ clientId })
    .onDuplicateKeyUpdate({ set: { clientId } });
}

/** นับ 1 กิจกรรมของวันนี้เข้า streak (เรียกได้หลายครั้ง/วัน — นับซ้ำวันเดียวกันแค่ครั้งเดียว) */
async function bumpStreak(clientId: number): Promise<void> {
  await ensureStreakRow(clientId);
  const [row] = await db
    .select()
    .from(clientStreaks)
    .where(eq(clientStreaks.clientId, clientId))
    .limit(1);
  if (!row) return;

  const today = toDateStr(new Date());
  if (row.lastActiveDate === today) return; // นับไปแล้ววันนี้

  const diff = row.lastActiveDate
    ? differenceInCalendarDays(new Date(`${today}T00:00:00`), new Date(`${row.lastActiveDate}T00:00:00`))
    : null;
  const nextStreak = diff === 1 ? row.currentStreak + 1 : 1;

  await db
    .update(clientStreaks)
    .set({
      currentStreak: nextStreak,
      longestStreak: Math.max(row.longestStreak, nextStreak),
      lastActiveDate: today,
    })
    .where(eq(clientStreaks.clientId, clientId));
}

async function awardPoints(clientId: number, points: number, reason: string, refId?: number) {
  await db.insert(pointEvents).values({ clientId, points, reason, refId: refId ?? null });
}

/** เช็คเงื่อนไข badge ทั้งหมด ปลดล็อกอันที่ถึงเกณฑ์แล้วแต่ยังไม่เคยได้ (ให้แต้มโบนัสด้วย) */
async function checkAndAwardBadges(clientId: number, badgeBonus: number): Promise<void> {
  const [sessionsRow] = await db
    .select({ c: sql<number>`count(*)` })
    .from(bookings)
    .where(and(eq(bookings.clientId, clientId), eq(bookings.status, "COMPLETED")));
  const [foodRow] = await db
    .select({ c: sql<number>`count(*)` })
    .from(foodLogs)
    .where(eq(foodLogs.clientId, clientId));
  const [streakRow] = await db
    .select()
    .from(clientStreaks)
    .where(eq(clientStreaks.clientId, clientId))
    .limit(1);

  const sessions = Number(sessionsRow?.c ?? 0);
  const foodCount = Number(foodRow?.c ?? 0);
  const longestStreak = streakRow?.longestStreak ?? 0;

  const qualifies: Record<string, boolean> = {
    FIRST_SESSION: sessions >= 1,
    SESSIONS_10: sessions >= 10,
    SESSIONS_50: sessions >= 50,
    SESSIONS_100: sessions >= 100,
    STREAK_3: longestStreak >= 3,
    STREAK_7: longestStreak >= 7,
    STREAK_30: longestStreak >= 30,
    FOOD_FIRST: foodCount >= 1,
    FOOD_20: foodCount >= 20,
  };

  const earnedRows = await db
    .select({ code: clientBadges.code })
    .from(clientBadges)
    .where(eq(clientBadges.clientId, clientId));
  const earned = new Set(earnedRows.map((r) => r.code));

  for (const [code, ok] of Object.entries(qualifies)) {
    if (!ok || earned.has(code)) continue;
    try {
      await db.insert(clientBadges).values({ clientId, code });
      await awardPoints(clientId, badgeBonus, "BADGE_BONUS", undefined);
    } catch {
      // เงื่อนไข unique(client_id, code) กันชนกันถ้าเรียกซ้อนกันพอดี — ข้ามได้ปลอดภัย
    }
  }
}

/** เรียกหลังบันทึกว่า "มาเทรน" สำเร็จ (จบ session ด้วยการจับเวลา หรือกดมาเทรนแบบไม่จับเวลา) */
export async function onTrainingCompleted(clientId: number, bookingId: number): Promise<void> {
  const settings = await getSiteSettings();
  if (!settings.gamificationEnabled) return;
  await awardPoints(clientId, settings.pointsTrainingCompleted, "TRAINING_COMPLETED", bookingId);
  await bumpStreak(clientId);
  await checkAndAwardBadges(clientId, settings.pointsBadgeBonus);
}

/** เรียกหลังลูกเทรนส่งรูปอาหารสำเร็จ */
export async function onFoodLogged(clientId: number, foodLogId: number): Promise<void> {
  const settings = await getSiteSettings();
  if (!settings.gamificationEnabled) return;
  await awardPoints(clientId, settings.pointsFoodLogged, "FOOD_LOGGED", foodLogId);
  await bumpStreak(clientId);
  await checkAndAwardBadges(clientId, settings.pointsBadgeBonus);
}

export type GamificationProfile = {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  badges: (BadgeDef & { earnedAt: Date | null })[];
  leaderboardOptIn: boolean;
};

export async function getGamificationProfile(clientId: number): Promise<GamificationProfile> {
  const [pointsRow] = await db
    .select({ total: sql<number>`coalesce(sum(${pointEvents.points}), 0)` })
    .from(pointEvents)
    .where(eq(pointEvents.clientId, clientId));

  const [streakRow] = await db
    .select()
    .from(clientStreaks)
    .where(eq(clientStreaks.clientId, clientId))
    .limit(1);

  const earnedRows = await db
    .select()
    .from(clientBadges)
    .where(eq(clientBadges.clientId, clientId));
  const earnedMap = new Map(earnedRows.map((r) => [r.code, r.earnedAt]));

  return {
    totalPoints: Number(pointsRow?.total ?? 0),
    currentStreak: streakRow?.currentStreak ?? 0,
    longestStreak: streakRow?.longestStreak ?? 0,
    leaderboardOptIn: streakRow?.leaderboardOptIn ?? false,
    badges: BADGES.map((b) => ({ ...b, earnedAt: earnedMap.get(b.code) ?? null })),
  };
}

export async function setLeaderboardOptIn(clientId: number, optIn: boolean): Promise<void> {
  await ensureStreakRow(clientId);
  await db
    .update(clientStreaks)
    .set({ leaderboardOptIn: optIn })
    .where(eq(clientStreaks.clientId, clientId));
}
