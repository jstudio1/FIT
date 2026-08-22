import "server-only";

import { and, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "./db";
import { menuItems, foodLogs, foodComments, clientProfiles } from "./db/schema";
import {
  latestNutritionPerLog,
  nutritionForLog,
  sumTotals,
  type NutritionEntry,
} from "./nutrition";
import { toDateStr } from "./schedule";

export type MenuItemDTO = {
  id: number;
  name: string;
  description: string | null;
  ingredients: string[];
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  tagClean: boolean;
  tagLowCal: boolean;
  tagDessert: boolean;
  hasImage: boolean;
};

/**
 * บาง driver/DB (เช่น MariaDB ผ่าน mysql2) ไม่ auto-parse คอลัมน์ JSON ให้ —
 * คืนมาเป็น string ดิบแทนที่จะเป็น array ตรงๆ กันไว้ทั้งสองแบบ
 */
function parseIngredients(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toDTO(row: typeof menuItems.$inferSelect): MenuItemDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ingredients: parseIngredients(row.ingredients),
    calories: row.calories,
    protein: row.protein,
    carb: row.carb,
    fat: row.fat,
    tagClean: row.tagClean,
    tagLowCal: row.tagLowCal,
    tagDessert: row.tagDessert,
    hasImage: !!row.imagePath,
  };
}

export async function getMenuItemById(id: number): Promise<MenuItemDTO | null> {
  const [row] = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.isActive, true)))
    .limit(1);
  return row ? toDTO(row) : null;
}

/** เมนูแนะนำประจำวัน — สลับชุดทุกวันแบบ deterministic (คนละชุดกันแต่ละวัน แต่วันเดียวกันเห็นเหมือนกันทั้งวัน) */
export async function getDailyMenu(limit = 5): Promise<MenuItemDTO[]> {
  const all = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isActive, true))
    .orderBy(menuItems.id);
  if (all.length === 0) return [];

  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - startOfYear.getTime()) / 86400000);
  const count = Math.min(limit, all.length);
  const offset = dayOfYear % all.length;

  const picked = Array.from({ length: count }, (_, i) => all[(offset + i) % all.length]);
  return picked.map(toDTO);
}

export async function getMenusByTag(
  tag: "CLEAN" | "LOW_CAL" | "DESSERT",
  limit = 60,
): Promise<MenuItemDTO[]> {
  const col =
    tag === "CLEAN" ? menuItems.tagClean : tag === "LOW_CAL" ? menuItems.tagLowCal : menuItems.tagDessert;
  const rows = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.isActive, true), eq(col, true)))
    .orderBy(menuItems.name)
    .limit(limit);
  return rows.map(toDTO);
}

/** สุ่มเมนูจากทั้งระบบ N รายการ — ใช้กับวงล้อเสี่ยงโชคเมนู (สุ่มชุดใหม่ทุกครั้งที่โหลดหน้า) */
export async function getRandomMenus(limit = 10): Promise<MenuItemDTO[]> {
  const rows = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isActive, true))
    .orderBy(sql`RAND()`)
    .limit(limit);
  return rows.map(toDTO);
}

export type MenuCounts = {
  total: number;
  clean: number;
  lowCal: number;
  dessert: number;
};

/** จำนวนเมนูทั้งหมด + แยกตามแท็ก — ใช้แสดงตัวเลขกำกับแต่ละแท็บ */
export async function getMenuCounts(): Promise<MenuCounts> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      clean: sql<number>`sum(${menuItems.tagClean})`,
      lowCal: sql<number>`sum(${menuItems.tagLowCal})`,
      dessert: sql<number>`sum(${menuItems.tagDessert})`,
    })
    .from(menuItems)
    .where(eq(menuItems.isActive, true));

  return {
    total: Number(row?.total ?? 0),
    clean: Number(row?.clean ?? 0),
    lowCal: Number(row?.lowCal ?? 0),
    dessert: Number(row?.dessert ?? 0),
  };
}

export type RemainingCalories = {
  target: number | null;
  consumed: number;
  remaining: number | null;
};

/** แคลอรี่ที่เหลือของวันนี้ = เป้าหมายที่เทรนเนอร์ตั้งไว้ - ที่กินไปแล้ว (นับจากรูปอาหารที่มีข้อมูลโภชนาการ) */
export async function getRemainingCaloriesToday(clientId: number): Promise<RemainingCalories> {
  const [profile] = await db
    .select({ targetCalories: clientProfiles.targetCalories })
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, clientId))
    .limit(1);
  const target = profile?.targetCalories ?? null;

  const today = toDateStr(new Date());
  const start = new Date(`${today}T00:00:00`);
  const end = new Date(start.getTime() + 86400000);

  const logs = await db
    .select()
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.clientId, clientId),
        gte(foodLogs.createdAt, start),
        lt(foodLogs.createdAt, end),
      ),
    );
  const logIds = logs.map((l) => l.id);
  const comments = logIds.length
    ? await db
        .select()
        .from(foodComments)
        .where(inArray(foodComments.foodLogId, logIds))
    : [];
  const entries: NutritionEntry[] = comments.map((c) => ({
    foodLogId: c.foodLogId,
    calories: c.calories,
    carbs: c.carbs,
    protein: c.protein,
    fat: c.fat,
    createdAt: c.createdAt,
  }));
  const latestMap = latestNutritionPerLog(entries);
  const nutritionList = logs
    .map((l) => nutritionForLog(l, latestMap.get(l.id)))
    .filter((x): x is NutritionEntry => !!x);
  const totals = sumTotals(nutritionList);

  return {
    target,
    consumed: totals.calories,
    remaining: target != null ? Math.max(0, target - totals.calories) : null,
  };
}

/** เมนูที่พอดีกับแคลอรี่ที่เหลือของวันนี้ — เรียงจากใกล้เคียงที่สุดก่อน */
export async function getMenusByRemainingCalories(
  clientId: number,
  limit = 12,
): Promise<{ menus: MenuItemDTO[]; remaining: RemainingCalories }> {
  const remaining = await getRemainingCaloriesToday(clientId);
  if (remaining.remaining == null) return { menus: [], remaining };

  const cap = Math.max(remaining.remaining, 50); // กันกรณีเหลือ 0 ไม่ให้ไม่เจอเมนูเลย
  const rows = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.isActive, true), lte(menuItems.calories, cap)))
    .orderBy(sql`abs(${menuItems.calories} - ${remaining.remaining})`)
    .limit(limit);

  return { menus: rows.map(toDTO), remaining };
}
