"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, ChevronRight } from "lucide-react";

export type OwnerChatInboxItem = {
  trainerId: number;
  trainerName: string;
  clientId: number;
  clientName: string;
  clientNickname: string | null;
  clientAvatar: string | null;
  lastPreview: string | null;
  lastAt: string | null;
};

export function OwnerChatInboxList({ items }: { items: OwnerChatInboxItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = items.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.clientName.toLowerCase().includes(q) ||
      c.trainerName.toLowerCase().includes(q) ||
      (c.clientNickname?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div>
      {items.length > 5 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อเทรนเนอร์หรือลูกเทรน..."
            className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          ไม่พบรายการที่ตรงกับ &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card divide-y divide-border overflow-hidden">
          {filtered.map((c) => (
            <Link
              key={`${c.trainerId}-${c.clientId}`}
              href={`/owner/chat/${c.trainerId}/${c.clientId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold overflow-hidden">
                {c.clientAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/avatar/${c.clientId}`}
                    alt={c.clientName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  c.clientName.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {c.clientName}
                  {c.clientNickname && (
                    <span className="text-muted-foreground font-normal"> ({c.clientNickname})</span>
                  )}
                  <span className="text-muted-foreground font-normal"> ↔ {c.trainerName}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.lastPreview ?? "ยังไม่มีข้อความ"}
                </div>
              </div>
              {c.lastAt && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {format(new Date(c.lastAt), "d MMM HH:mm")}
                </span>
              )}
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
