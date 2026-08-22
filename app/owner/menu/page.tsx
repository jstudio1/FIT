import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { OwnerMenuGrid, type OwnerMenuItem } from "@/components/owner-menu-grid";

export const dynamic = "force-dynamic";

export default async function OwnerMenuListPage() {
  await requireRole("OWNER");

  const rows = await db.select().from(menuItems).orderBy(desc(menuItems.id));
  const items: OwnerMenuItem[] = rows.map((m) => ({
    id: m.id,
    name: m.name,
    calories: m.calories,
    protein: m.protein,
    carb: m.carb,
    fat: m.fat,
    tagClean: m.tagClean,
    tagLowCal: m.tagLowCal,
    tagDessert: m.tagDessert,
    isActive: m.isActive,
    hasImage: !!m.imagePath,
  }));

  return (
    <>
      <PageHeader
        title="จัดการเมนูแนะนำ"
        description={`ทั้งหมด ${rows.length} เมนู — แก้ไข/เปลี่ยนรูป/เพิ่ม/ลบเมนูที่ลูกเทรนเห็นในแอป`}
      />

      <div className="mb-5">
        <Link href="/owner/menu/new">
          <Button>
            <Plus className="size-4" />
            เพิ่มเมนูใหม่
          </Button>
        </Link>
      </div>

      <OwnerMenuGrid items={items} />
    </>
  );
}
