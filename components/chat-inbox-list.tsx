"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";

export type ChatInboxItem = {
  id: number;
  fullName: string;
  nickname: string | null;
  avatarPath: string | null;
  lastPreview: string | null;
  lastIsMine: boolean;
  unread: number;
};

export function ChatInboxList({ items }: { items: ChatInboxItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = items.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.fullName.toLowerCase().includes(q) || (c.nickname?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div>
      {items.length > 5 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อลูกเทรน..."
            className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          ไม่พบลูกเทรนที่ตรงกับ &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card divide-y divide-border overflow-hidden">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/trainer/chat/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold overflow-hidden">
                {c.avatarPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/avatar/${c.id}`} alt={c.fullName} className="h-full w-full object-cover" />
                ) : (
                  c.fullName.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {c.fullName}
                  {c.nickname && <span className="text-muted-foreground font-normal"> ({c.nickname})</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.lastPreview ? `${c.lastIsMine ? "คุณ: " : ""}${c.lastPreview}` : "ยังไม่มีข้อความ"}
                </div>
              </div>
              {c.unread > 0 && (
                <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-medium flex items-center justify-center">
                  {c.unread > 9 ? "9+" : c.unread}
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
