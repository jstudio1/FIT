import Link from "next/link";
import { Leaf, Flame, Cookie, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItemDTO } from "@/lib/menu";

export function MenuCard({
  menu,
  compact = false,
  index = 0,
}: {
  menu: MenuItemDTO;
  compact?: boolean;
  index?: number;
}) {
  return (
    <Link
      href={`/client/menu/${menu.id}`}
      className="group block rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-menu-in"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "aspect-[4/3]" : "aspect-square",
        )}
      >
        {menu.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/menu/${menu.id}`}
            alt={menu.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <UtensilsCrossed className="size-6" />
          </div>
        )}

        {/* ไล่เฉดมืดด้านล่างให้ตัวอักษรอ่านง่าย */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />

        {/* แคลอรี่ — มุมขวาบนจุดเดียว สไตล์กระจกฝ้า (ไม่มีอย่างอื่นแชร์แถวเดียวกัน กันชนกัน) */}
        <div className="absolute top-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm whitespace-nowrap">
          {menu.calories} kcal
        </div>

        {/* ชื่อเมนู — ทับบนรูปด้านล่าง */}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <div className="text-white font-semibold text-sm leading-snug drop-shadow-sm line-clamp-2">
            {menu.name}
          </div>
        </div>
      </div>

      <div className="p-2.5">
        {/* แท็กคลีน/แคลน้อย/ขนม — ย้ายลงมาไว้ใต้รูป ไม่แย่งพื้นที่กับป้ายแคลอรี่แล้ว */}
        {(menu.tagClean || menu.tagLowCal || menu.tagDessert) && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {menu.tagClean && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                <Leaf className="size-2.5" /> คลีน
              </span>
            )}
            {menu.tagLowCal && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Flame className="size-2.5" /> แคลน้อย
              </span>
            )}
            {menu.tagDessert && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                <Cookie className="size-2.5" /> ขนม
              </span>
            )}
          </div>
        )}
        {!compact && menu.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{menu.description}</p>
        )}
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-sky-500" />P {menu.protein}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-amber-500" />C {menu.carb}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-rose-500" />F {menu.fat}
          </span>
        </div>
      </div>
    </Link>
  );
}
