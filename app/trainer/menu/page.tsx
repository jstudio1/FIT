import Link from "next/link";
import { UtensilsCrossed, ChefHat, Leaf, Flame, Cookie, BookOpen, Dices } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { getDailyMenu, getMenusByTag, getMenuCounts, getRandomMenus } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";
import { MenuCard } from "@/components/menu-card";
import { MenuLuckyDraw } from "@/components/menu-lucky-draw";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "daily" | "clean" | "lowcal" | "dessert" | "lucky";

export default async function TrainerMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole("TRAINER");
  const sp = await searchParams;
  const tab: Tab = (["daily", "clean", "lowcal", "dessert", "lucky"] as Tab[]).includes(
    sp.tab as Tab,
  )
    ? (sp.tab as Tab)
    : "daily";

  const counts = await getMenuCounts();

  const TABS: { key: Tab; label: string; icon: typeof ChefHat; count: number | null }[] = [
    { key: "daily", label: "ประจำวัน", icon: ChefHat, count: null },
    { key: "clean", label: "อาหารคลีน", icon: Leaf, count: counts.clean },
    { key: "lowcal", label: "แคลน้อย", icon: Flame, count: counts.lowCal },
    { key: "dessert", label: "ขนมเพื่อสุขภาพ", icon: Cookie, count: counts.dessert },
    { key: "lucky", label: "เสี่ยงโชคเมนู", icon: Dices, count: null },
  ];

  let menus: Awaited<ReturnType<typeof getDailyMenu>> = [];
  let luckyMenus: Awaited<ReturnType<typeof getRandomMenus>> = [];

  if (tab === "daily") {
    menus = await getDailyMenu(8);
  } else if (tab === "clean") {
    menus = await getMenusByTag("CLEAN");
  } else if (tab === "lowcal") {
    menus = await getMenusByTag("LOW_CAL");
  } else if (tab === "dessert") {
    menus = await getMenusByTag("DESSERT");
  } else {
    luckyMenus = await getRandomMenus(10);
  }

  return (
    <>
      <PageHeader title="เมนูแนะนำ" description="เมนูอาหารคลีน แคลน้อย และขนมเพื่อสุขภาพ สำหรับแนะนำลูกเทรน" />

      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-4 px-3 py-1.5 rounded-full bg-muted">
        <BookOpen className="size-3.5" />
        คลังเมนูทั้งหมด <span className="font-semibold text-foreground">{counts.total}</span> เมนู
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/trainer/menu?tab=${t.key}`}
              className={cn(
                "inline-flex items-center gap-1.5 pl-3.5 pr-2.5 py-2 rounded-full text-sm font-medium border transition-all",
                active
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-transparent shadow-md shadow-primary/25 scale-[1.03]"
                  : "border-border text-muted-foreground hover:bg-muted hover:scale-[1.02]",
              )}
            >
              <Icon className="size-4" />
              {t.label}
              {t.count != null && (
                <span
                  className={cn(
                    "text-[11px] font-semibold rounded-full px-1.5 py-0.5 min-w-5 text-center",
                    active ? "bg-white/20" : "bg-muted",
                  )}
                >
                  {t.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {tab === "lucky" ? (
        <MenuLuckyDraw initialMenus={luckyMenus} />
      ) : menus.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          <UtensilsCrossed className="size-8 mx-auto mb-2" />
          ยังไม่มีเมนูในหมวดนี้
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {menus.map((m, i) => (
            <MenuCard key={m.id} menu={m} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
