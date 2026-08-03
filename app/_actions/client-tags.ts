"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientTags, clientTagLinks, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";

export type Res = { error?: string; success?: string; tagId?: number };

// วนสีตามลำดับที่สร้าง ไม่ต้องให้เทรนเนอร์เลือกเอง (ลดขั้นตอน)
const TAG_COLORS = ["teal", "blue", "amber", "rose", "violet", "emerald"];

export async function createTagAction(name: string): Promise<Res> {
  const trainer = await requireRole("TRAINER");
  const trimmed = name.trim();
  if (!trimmed) return { error: "กรุณากรอกชื่อแท็ก" };
  if (trimmed.length > 40) return { error: "ชื่อแท็กยาวเกินไป" };

  const existing = await db
    .select({ id: clientTags.id })
    .from(clientTags)
    .where(and(eq(clientTags.trainerId, trainer.id), eq(clientTags.name, trimmed)))
    .limit(1);
  if (existing[0]) return { error: "มีแท็กชื่อนี้อยู่แล้ว", tagId: existing[0].id };

  const [{ c }] = await db
    .select({ c: count() })
    .from(clientTags)
    .where(eq(clientTags.trainerId, trainer.id));
  const color = TAG_COLORS[Number(c) % TAG_COLORS.length];

  const [result] = await db
    .insert(clientTags)
    .values({ trainerId: trainer.id, name: trimmed, color });

  revalidatePath("/trainer/clients");
  return { success: `สร้างแท็ก "${trimmed}" แล้ว`, tagId: result.insertId };
}

export async function deleteTagAction(tagId: number): Promise<Res> {
  const trainer = await requireRole("TRAINER");

  const [tag] = await db
    .select({ id: clientTags.id })
    .from(clientTags)
    .where(and(eq(clientTags.id, tagId), eq(clientTags.trainerId, trainer.id)))
    .limit(1);
  if (!tag) return { error: "ไม่พบแท็กนี้" };

  await db.transaction(async (tx) => {
    await tx.delete(clientTagLinks).where(eq(clientTagLinks.tagId, tagId));
    await tx.delete(clientTags).where(eq(clientTags.id, tagId));
  });

  revalidatePath("/trainer/clients");
  return { success: "ลบแท็กแล้ว" };
}

/** ติด/ถอดแท็กให้ลูกเทรน (toggle) */
export async function toggleClientTagAction(
  clientId: number,
  tagId: number,
): Promise<Res> {
  const trainer = await requireRole("TRAINER");

  const [tag] = await db
    .select({ id: clientTags.id })
    .from(clientTags)
    .where(and(eq(clientTags.id, tagId), eq(clientTags.trainerId, trainer.id)))
    .limit(1);
  if (!tag) return { error: "ไม่พบแท็กนี้" };

  const [client] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, clientId), eq(users.role, "CLIENT"), eq(users.trainerId, trainer.id)))
    .limit(1);
  if (!client) return { error: "ไม่มีสิทธิ์แก้ไขลูกเทรนรายนี้" };

  const existingLink = await db
    .select()
    .from(clientTagLinks)
    .where(and(eq(clientTagLinks.tagId, tagId), eq(clientTagLinks.clientId, clientId)))
    .limit(1);

  if (existingLink[0]) {
    await db
      .delete(clientTagLinks)
      .where(and(eq(clientTagLinks.tagId, tagId), eq(clientTagLinks.clientId, clientId)));
  } else {
    await db.insert(clientTagLinks).values({ tagId, clientId });
  }

  revalidatePath("/trainer/clients");
  revalidatePath(`/trainer/clients/${clientId}`);
  return { success: existingLink[0] ? "ถอดแท็กแล้ว" : "ติดแท็กแล้ว" };
}
