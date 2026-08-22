import Link from "next/link";
import { UtensilsCrossed, ChefHat, Leaf, Flame, Target, Cookie, BookOpen, Dices } from "lucide-react";
import { requireRole } from "@/lib/authz";
import {
  getDailyMenu,
  getMenusByTag,
  getMenusByRemainingCalories,
  getMenuCounts,
  getRandomMenus,
} from "@/lib/menu";
import { PageHeader } from "@/components/page-header";
import { MenuCard } from "@/components/menu-card";
import { CalorieRing } from "@/components/calorie-ring";
import { MenuLuckyDraw } from "@/components/menu-lucky-draw";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "daily" | "clean" | "lowcal" | "dessert" | "remaining" | "lucky";

export default async function ClientMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const client = await requireRole("CLIENT");
  const sp = await searchParams;
  const tab: Tab = (
    ["daily", "clean", "lowcal", "dessert", "remaining", "lucky"] as Tab[]
  ).includes(sp.tab as Tab)
    ? (sp.tab as Tab)
    : "daily";

  const counts = await getMenuCounts();

  const TABS: { key: Tab; label: string; icon: typeof ChefHat; count: number | null }[] = [
    { key: "daily", label: "ประจำวัน", icon: ChefHat, count: null },
    { key: "clean", label: "อาหารคลีน", icon: Leaf, count: counts.clean },
    { key: "lowcal", label: "แคลน้อย", icon: Flame, count: counts.lowCal },
    { key: "dessert", label: "ขนมเพื่อสุขภาพ", icon: Cookie, count: counts.dessert },
    { key: "remaining", label: "ตามแคลที่เหลือของฉัน", icon: Target, count: null },
    { key: "lucky", label: "เสี่ยงโชคเมนู", icon: Dices, count: null },
  ];

  let menus: Awaited<ReturnType<typeof getDailyMenu>> = [];
  let remainingInfo: Awaited<ReturnType<typeof getMenusByRemainingCalories>>["remaining"] | null = null;
  let luckyMenus: Awaited<ReturnType<typeof getRandomMenus>> = [];

  if (tab === "daily") {
    menus = await getDailyMenu(8);
  } else if (tab === "clean") {
    menus = await getMenusByTag("CLEAN");
  } else if (tab === "lowcal") {
    menus = await getMenusByTag("LOW_CAL");
  } else if (tab === "dessert") {
    menus = await getMenusByTag("DESSERT");
  } else if (tab === "lucky") {
    luckyMenus = await getRandomMenus(10);
  } else {
    const res = await getMenusByRemainingCalories(client.id);
    menus = res.menus;
    remainingInfo = res.remaining;
  }

  return (
    <>
      <PageHeader title="เมนูแนะนำ" description="เมนูอาหารคลีน แคลน้อย ขนมเพื่อสุขภาพ และตามแคลที่เหลือของวันนี้" />

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
              href={`/client/menu?tab=${t.key}`}
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

      {tab === "remaining" && (
        <div className="mb-5 rounded-[var(--radius-lg)] border border-border bg-card p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          {remainingInfo?.target == null ? (
            <p className="text-sm text-muted-foreground relative">
              เทรนเนอร์ยังไม่ได้ตั้งเป้าหมายแคลอรี่ต่อวันให้คุณ — ให้เทรนเนอร์ตั้งค่าก่อนเพื่อดูเมนูตามแคลที่เหลือ
            </p>
          ) : (
            <div className="flex items-center gap-5 relative">
              <CalorieRing consumed={remainingInfo.consumed} target={remainingInfo.target} />
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
                  {remainingInfo.remaining?.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1.5">
                    kcal เหลือวันนี้
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  กินไปแล้ว{" "}
                  <span className="font-medium text-foreground">
                    {remainingInfo.consumed.toLocaleString()}
                  </span>{" "}
                  จาก{" "}
                  <span className="font-medium text-foreground">
                    {remainingInfo.target.toLocaleString()}
                  </span>{" "}
                  kcal
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "lucky" ? (
        <MenuLuckyDraw initialMenus={luckyMenus} />
      ) : menus.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          <UtensilsCrossed className="size-8 mx-auto mb-2" />
          {tab === "remaining" ? "ยังไม่มีเมนูที่พอดีกับแคลที่เหลือ" : "ยังไม่มีเมนูในหมวดนี้"}
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
