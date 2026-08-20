import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { MenuAdminForm, type MenuAdminInitial } from "@/components/menu-admin-form";

export const dynamic = "force-dynamic";

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

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("OWNER");
  const { id } = await params;
  const menuId = Number(id);
  if (!Number.isFinite(menuId)) notFound();

  const [row] = await db.select().from(menuItems).where(eq(menuItems.id, menuId)).limit(1);
  if (!row) notFound();
  const { maxUploadSizeMb } = await getSiteSettings();

  const initial: MenuAdminInitial = {
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
    mealType: row.mealType,
    isActive: row.isActive,
    hasImage: !!row.imagePath,
    imageCredit: row.imageCredit,
  };

  return (
    <>
      <Link
        href="/owner/menu"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้าจัดการเมนู
      </Link>
      <PageHeader title={`แก้ไข: ${row.name}`} description="แก้ข้อมูล เปลี่ยนรูป หรือลบเมนูนี้" />
      <MenuAdminForm initial={initial} maxUploadSizeMb={maxUploadSizeMb} />
    </>
  );
}
