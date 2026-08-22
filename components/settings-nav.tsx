"use client";

import { useEffect, useRef, useState } from "react";
import {
  Globe,
  Megaphone,
  ToggleLeft,
  SlidersHorizontal,
  LayoutTemplate,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "site", label: "ชื่อเว็บ & SEO", icon: Globe },
  { id: "popup", label: "ป็อปอัพประกาศ", icon: Megaphone },
  { id: "toggles", label: "แชท & แต้มสะสม", icon: ToggleLeft },
  { id: "operational", label: "ค่าดำเนินงาน", icon: SlidersHorizontal },
  { id: "login-theme", label: "ธีมหน้า Login", icon: LayoutTemplate },
  { id: "integrations", label: "API & บริการ", icon: KeyRound },
];

export function SettingsNav() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    elements.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="space-y-0.5">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollTo(s.id)}
            className={cn(
              "group relative flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary transition-all duration-300",
                isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0",
              )}
            />
            <Icon
              className={cn(
                "size-4 shrink-0 transition-transform duration-200",
                isActive ? "scale-110" : "group-hover:scale-110",
              )}
            />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
