"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  CalendarDays,
  UtensilsCrossed,
  Camera,
  LineChart,
  UsersRound,
  Megaphone,
  Settings,
  ClipboardList,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/_actions/auth";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/db/schema";
import { NotificationBell } from "@/components/notification-bell";
import { AppointmentReminder } from "@/components/appointment-reminder";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: Record<Role, NavItem[]> = {
  OWNER: [
    { href: "/owner", label: "ภาพรวมระบบ", icon: LayoutDashboard },
    { href: "/owner/trainers", label: "เทรนเนอร์", icon: Users },
    { href: "/owner/clients", label: "ลูกเทรนทั้งหมด", icon: UsersRound },
    { href: "/owner/reports", label: "รายงาน", icon: ClipboardList },
    { href: "/owner/broadcast", label: "ประกาศ", icon: Megaphone },
    { href: "/owner/settings", label: "ตั้งค่าเว็บไซต์", icon: Settings },
  ],
  TRAINER: [
    { href: "/trainer", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/trainer/clients", label: "ลูกเทรน", icon: Users },
    { href: "/trainer/schedule", label: "ตารางเทรน", icon: CalendarDays },
    { href: "/trainer/reports", label: "รายงาน", icon: ClipboardList },
    { href: "/trainer/food-review", label: "ตรวจอาหาร", icon: UtensilsCrossed },
  ],
  CLIENT: [
    { href: "/client", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/client/schedule", label: "จองเวลาเทรน", icon: CalendarDays },
    { href: "/client/results", label: "ผลลัพธ์", icon: LineChart },
    { href: "/client/food", label: "ส่งอาหาร", icon: Camera },
    { href: "/client/privacy", label: "ความเป็นส่วนตัว", icon: ShieldCheck },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "เจ้าของระบบ",
  TRAINER: "เทรนเนอร์",
  CLIENT: "ลูกเทรน",
};

export function AppShell({
  role,
  name,
  children,
}: {
  role: Role;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = NAV[role];

  const isActive = (href: string) =>
    pathname === href || (href !== `/${role.toLowerCase()}` && pathname.startsWith(href + "/"));

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 lg:static",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Dumbbell className="size-5" />
          </div>
          <div>
            <div className="font-bold leading-tight">Trainner</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {ROLE_LABEL[role]}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 mb-1">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-xs text-muted-foreground">
              {ROLE_LABEL[role]}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            >
              <LogOut className="size-4.5" />
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between gap-3 px-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="p-2 -ml-2 rounded-md hover:bg-muted lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <span className="font-bold lg:hidden">Trainner</span>
          </div>
          <NotificationBell />
        </header>
        <AppointmentReminder />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
