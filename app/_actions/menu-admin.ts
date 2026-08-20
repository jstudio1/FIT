"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { deleteMenuImage, saveMenuImage } from "@/lib/upload";
import { fetchPexelsPhoto } from "@/lib/pexels";

export type Res = { error?: string; success?: string; id?: number; imageCredit?: string };

export type MenuItemInput = {
  id: number | null;
  name: string;
  description: string;
  ingredients: string; // ช่องเดียว บรรทัดละ 1 รายการ — parse เอง
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  tagClean: boolean;
  tagLowCal: boolean;
  tagDessert: boolean;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "ANY";
  isActive: boolean;
};

function revalidateMenuPaths(id?: number) {
  revalidatePath("/owner/menu");
  revalidatePath("/client/menu");
  revalidatePath("/client");
  if (id) revalidatePath(`/owner/menu/${id}`);
  if (id) revalidatePath(`/client/menu/${id}`);
}

export async function saveMenuItemAction(input: MenuItemInput): Promise<Res> {
  const owner = await requireRole("OWNER");

  const name = input.name.trim();
  if (!name) return { error: "กรุณากรอกชื่อเมนู" };
  if (name.length > 191) return { error: "ชื่อเมนูยาวเกินไป" };
  if (!Number.isFinite(input.calories) || input.calories < 0) return { error: "แคลอรี่ไม่ถูกต้อง" };
  if (!Number.isFinite(input.protein) || input.protein < 0) return { error: "โปรตีนไม่ถูกต้อง" };
  if (!Number.isFinite(input.carb) || input.carb < 0) return { error: "คาร์บไม่ถูกต้อง" };
  if (!Number.isFinite(input.fat) || input.fat < 0) return { error: "ไขมันไม่ถูกต้อง" };

  const ingredients = input.ingredients
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

  const values = {
    name,
    description: input.description.trim() || null,
    ingredients,
    calories: Math.round(input.calories),
    protein: Math.round(input.protein),
    carb: Math.round(input.carb),
    fat: Math.round(input.fat),
    tagClean: input.tagClean,
    tagLowCal: input.tagLowCal,
    tagDessert: input.tagDessert,
    mealType: input.mealType,
    isActive: input.isActive,
  };

  if (input.id) {
    const [existing] = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.id, input.id))
      .limit(1);
    if (!existing) return { error: "ไม่พบเมนูนี้" };

    await db.update(menuItems).set(values).where(eq(menuItems.id, input.id));
    await writeAudit({
      actorId: owner.id,
      action: "MENU_ITEM_UPDATED",
      resourceType: "MENU_ITEM",
      resourceId: input.id,
    });
    revalidateMenuPaths(input.id);
    return { success: "บันทึกเมนูแล้ว", id: input.id };
  }

  const [result] = await db.insert(menuItems).values(values);
  const newId = result.insertId;

  await writeAudit({
    actorId: owner.id,
    action: "MENU_ITEM_CREATED",
    resourceType: "MENU_ITEM",
    resourceId: newId,
  });
  revalidateMenuPaths(newId);
  return { success: "เพิ่มเมนูใหม่แล้ว — ตอนนี้เพิ่มรูปได้เลย", id: newId };
}

export async function deleteMenuItemAction(id: number): Promise<Res> {
  await requireRole("OWNER");

  const [existing] = await db
    .select({ imagePath: menuItems.imagePath })
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);
  if (!existing) return { error: "ไม่พบเมนูนี้" };

  await db.delete(menuItems).where(eq(menuItems.id, id));
  if (existing.imagePath) await deleteMenuImage(existing.imagePath);

  revalidateMenuPaths();
  return { success: "ลบเมนูแล้ว" };
}

/** ค้นรูปใหม่จาก Pexels ด้วยคำค้นที่ owner กรอกเอง แล้วแทนที่รูปเดิม */
export async function refetchMenuImageAction(id: number, query: string): Promise<Res> {
  const owner = await requireRole("OWNER");
  const q = query.trim();
  if (!q) return { error: "กรุณากรอกคำค้นหารูป (ภาษาอังกฤษจะได้ผลดีกว่า)" };

  const [existing] = await db
    .select({ imagePath: menuItems.imagePath })
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);
  if (!existing) return { error: "ไม่พบเมนูนี้" };

  const photo = await fetchPexelsPhoto(q);
  if (!photo) return { error: "หารูปที่เหมาะสมไม่เจอ ลองคำค้นอื่นดู" };

  const imagePath = await saveMenuImage(photo.buffer);
  const imageCredit = `ภาพโดย ${photo.photographer} จาก Pexels`;
  await db.update(menuItems).set({ imagePath, imageCredit }).where(eq(menuItems.id, id));
  if (existing.imagePath) await deleteMenuImage(existing.imagePath);

  await writeAudit({
    actorId: owner.id,
    action: "MENU_IMAGE_REFETCHED",
    resourceType: "MENU_ITEM",
    resourceId: id,
    metadata: { query: q },
  });

  revalidateMenuPaths(id);
  return { success: "อัปเดตรูปแล้ว", imageCredit };
}
