"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ImageOff,
  Leaf,
  Flame,
  Cookie,
  LayoutGrid,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OwnerMenuItem = {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  tagClean: boolean;
  tagLowCal: boolean;
  tagDessert: boolean;
  isActive: boolean;
  hasImage: boolean;
};

type CategoryKey = "all" | "clean" | "lowcal" | "dessert";

export function OwnerMenuGrid({ items }: { items: OwnerMenuItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");

  const counts = useMemo(
    () => ({
      all: items.length,
      clean: items.filter((m) => m.tagClean).length,
      lowcal: items.filter((m) => m.tagLowCal).length,
      dessert: items.filter((m) => m.tagDessert).length,
    }),
    [items],
  );

  const CATEGORIES: { key: CategoryKey; label: string; icon: typeof LayoutGrid }[] = [
    { key: "all", label: "ทั้งหมด", icon: LayoutGrid },
    { key: "clean", label: "คลีน", icon: Leaf },
    { key: "lowcal", label: "แคลน้อย", icon: Flame },
    { key: "dessert", label: "ขนมเพื่อสุขภาพ", icon: Cookie },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (category === "clean" && !m.tagClean) return false;
      if (category === "lowcal" && !m.tagLowCal) return false;
      if (category === "dessert" && !m.tagDessert) return false;
      return true;
    });
  }, [items, query, category]);

  return (
    <div>
      <div className="relative mb-4 animate-fade-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อเมนู..."
          className="w-full h-11 pl-9 pr-3 rounded-[var(--radius-md)] border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
      </div>

      <div
        style={{ "--stagger": 1 } as React.CSSProperties}
        className="animate-fade-up flex flex-wrap gap-2 mb-5"
      >
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cn(
                "inline-flex items-center gap-1.5 pl-3.5 pr-2.5 py-2 rounded-full text-sm font-medium border transition-all",
                active
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-transparent shadow-md shadow-primary/25 scale-[1.03]"
                  : "border-border text-muted-foreground hover:bg-muted hover:scale-[1.02]",
              )}
            >
              <Icon className="size-4" />
              {c.label}
              <span
                className={cn(
                  "text-[11px] font-semibold rounded-full px-1.5 py-0.5 min-w-5 text-center",
                  active ? "bg-white/20" : "bg-muted",
                )}
              >
                {counts[c.key]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          {query ? (
            <>ไม่พบเมนูที่ตรงกับ &ldquo;{query}&rdquo;</>
          ) : (
            "ยังไม่มีเมนูในหมวดนี้"
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((m, i) => (
            <Link
              key={m.id}
              href={`/owner/menu/${m.id}`}
              className="group block rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-menu-in"
              style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {m.hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/menu/${m.id}`}
                    alt={m.name}
                    className={cn(
                      "h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110",
                      !m.isActive && "grayscale opacity-60",
                    )}
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <ImageOff className="size-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                <div className="absolute top-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm whitespace-nowrap">
                  {m.calories} kcal
                </div>
                {!m.isActive && (
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white">
                    <EyeOff className="size-2.5" /> ปิดใช้งาน
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <div className="text-white font-semibold text-sm leading-snug drop-shadow-sm line-clamp-2">
                    {m.name}
                  </div>
                </div>
              </div>

              <div className="p-2.5">
                {(m.tagClean || m.tagLowCal || m.tagDessert) && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {m.tagClean && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        <Leaf className="size-2.5" /> คลีน
                      </span>
                    )}
                    {m.tagLowCal && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Flame className="size-2.5" /> แคลน้อย
                      </span>
                    )}
                    {m.tagDessert && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                        <Cookie className="size-2.5" /> ขนม
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-sky-500" />P {m.protein}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-500" />C {m.carb}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-rose-500" />F {m.fat}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
