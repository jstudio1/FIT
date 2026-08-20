import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Leaf, Flame, Cookie, ListTree } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { getMenuItemById } from "@/lib/menu";
import { MenuIngredientDiagram } from "@/components/menu-ingredient-diagram";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("CLIENT");
  const { id } = await params;
  const menuId = Number(id);
  if (!Number.isFinite(menuId)) notFound();

  const menu = await getMenuItemById(menuId);
  if (!menu) notFound();

  return (
    <>
      <Link
        href="/client/menu"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้าเมนูแนะนำ
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{menu.name}</h1>
          {menu.description && (
            <p className="text-sm text-muted-foreground mt-1">{menu.description}</p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {menu.tagClean && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              <Leaf className="size-3.5" /> คลีน
            </span>
          )}
          {menu.tagLowCal && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flame className="size-3.5" /> แคลน้อย
            </span>
          )}
          {menu.tagDessert && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Cookie className="size-3.5" /> ขนม
            </span>
          )}
        </div>
      </div>

      {/* ไดอะแกรมส่วนประกอบ */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6 sm:p-10 my-5">
        <div className="flex items-center gap-2 mb-6 justify-center text-muted-foreground">
          <ListTree className="size-4" />
          <h2 className="text-sm font-semibold">ส่วนประกอบหลัก</h2>
        </div>
        <MenuIngredientDiagram
          imageId={menu.id}
          imageAlt={menu.name}
          hasImage={menu.hasImage}
          ingredients={menu.ingredients}
        />
      </div>

      {/* โภชนาการ */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">ข้อมูลโภชนาการ (โดยประมาณ)</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xl sm:text-2xl font-bold text-primary">{menu.calories}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">kcal</div>
          </div>
          {(
            [
              { label: "โปรตีน", value: menu.protein, dot: "bg-sky-500" },
              { label: "คาร์บ", value: menu.carb, dot: "bg-amber-500" },
              { label: "ไขมัน", value: menu.fat, dot: "bg-rose-500" },
            ] as const
          ).map((m) => (
            <div key={m.label}>
              <div className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-1.5">
                <span className={cn("size-2 rounded-full", m.dot)} />
                {m.value}
                <span className="text-xs font-normal text-muted-foreground">ก.</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
