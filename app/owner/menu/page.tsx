import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus, ImageOff, Leaf, Flame, Cookie } from "lucide-react";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OwnerMenuListPage() {
  await requireRole("OWNER");

  const rows = await db.select().from(menuItems).orderBy(desc(menuItems.id));

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

      <div className="rounded-[var(--radius-lg)] border border-border bg-card divide-y divide-border overflow-hidden">
        {rows.map((m) => (
          <Link
            key={m.id}
            href={`/owner/menu/${m.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
              {m.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/menu/${m.id}`} alt={m.name} className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "font-medium text-sm truncate",
                  !m.isActive && "text-muted-foreground line-through",
                )}
              >
                {m.name}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground">{m.calories} kcal</span>
                {m.tagClean && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Leaf className="size-2.5" /> คลีน
                  </span>
                )}
                {m.tagLowCal && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Flame className="size-2.5" /> แคลน้อย
                  </span>
                )}
                {m.tagDessert && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                    <Cookie className="size-2.5" /> ขนม
                  </span>
                )}
                {!m.isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    ปิดใช้งาน
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
