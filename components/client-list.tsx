"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Search,
  ChevronRight,
  CalendarCheck,
  CalendarClock,
  UtensilsCrossed,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientListItem = {
  id: number;
  fullName: string;
  nickname: string | null;
  username: string;
  active: boolean;
  avatarPath: string | null;
  createdAt: string; // ISO
  lastTrainedLabel: string | null; // เช่น "3 วันก่อน" หรือ "วันนี้"
  lastTrainedSort: number; // epoch ms ของนัดล่าสุด, -Infinity ถ้ายังไม่เคยเทรน (ไว้เรียงลำดับ)
  nextSessionLabel: string | null; // เช่น "25 ก.ค. 14:00"
  pendingFoodCount: number;
  profileStepsDone: number;
  profileStepsTotal: number;
};

type SortKey = "recent" | "name" | "lastTrained" | "profileIncomplete";

const SORT_LABEL: Record<SortKey, string> = {
  recent: "เพิ่มล่าสุด",
  name: "ชื่อ (ก-ฮ)",
  lastTrained: "เทรนล่าสุด",
  profileIncomplete: "โปรไฟล์ยังไม่ครบก่อน",
};

export function ClientList({ clients }: { clients: ClientListItem[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = clients;
    if (q) {
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q) ||
          (c.nickname?.toLowerCase().includes(q) ?? false),
      );
    }
    const sorted = [...list];
    if (sort === "name") {
      sorted.sort((a, b) => a.fullName.localeCompare(b.fullName, "th"));
    } else if (sort === "lastTrained") {
      // ล่าสุดขึ้นก่อน, ยังไม่เคยเทรนไปอยู่ท้ายสุด
      sorted.sort((a, b) => b.lastTrainedSort - a.lastTrainedSort);
    } else if (sort === "profileIncomplete") {
      // เหลือขั้นตอนเยอะสุดขึ้นก่อน
      sorted.sort(
        (a, b) =>
          a.profileStepsDone - a.profileStepsTotal - (b.profileStepsDone - b.profileStepsTotal),
      );
    }
    return sorted;
  }, [clients, query, sort]);

  if (clients.length === 0) return null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, ชื่อเล่น, หรือ username..."
            className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 px-3 rounded-[var(--radius-md)] border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              เรียงตาม: {SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          ไม่พบลูกเทรนที่ตรงกับ &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/trainer/clients/${c.id}`}
              className="group flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-border bg-card p-3 sm:p-4 shadow-sm hover:border-primary/40 active:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm sm:text-base font-semibold overflow-hidden">
                  {c.avatarPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/avatar/${c.id}`}
                      alt={c.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    c.fullName.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm sm:text-base font-medium truncate">
                    {c.fullName}
                    {c.nickname && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({c.nickname})
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground truncate">
                    @{c.username}
                  </div>
                </div>
                {!c.active && (
                  <span className="shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                    ปิดใช้งาน
                  </span>
                )}
                <ChevronRight className="size-4 sm:size-5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[48px] sm:pl-[56px] text-[11px] sm:text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarCheck className="size-3.5" />
                  {c.lastTrainedLabel
                    ? `เทรนล่าสุด ${c.lastTrainedLabel}`
                    : "ยังไม่เคยเทรน"}
                </span>
                {c.nextSessionLabel && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-3.5" />
                    นัดถัดไป {c.nextSessionLabel}
                  </span>
                )}
                {c.pendingFoodCount > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full",
                      "bg-amber-100 text-amber-700",
                    )}
                  >
                    <UtensilsCrossed className="size-3.5" />
                    รออาหาร {c.pendingFoodCount}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full",
                    c.profileStepsDone >= c.profileStepsTotal
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <UserCircle className="size-3.5" />
                  โปรไฟล์ {c.profileStepsDone}/{c.profileStepsTotal}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
