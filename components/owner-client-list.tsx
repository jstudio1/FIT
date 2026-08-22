"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";

export type OwnerClientRow = {
  id: number;
  fullName: string;
  nickname: string | null;
  username: string;
  email: string | null;
  phone: string | null;
  avatarPath: string | null;
  active: boolean;
  trainerName: string | null;
};

export function OwnerClientList({ clients }: { clients: OwnerClientRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      (c.nickname?.toLowerCase().includes(q) ?? false) ||
      (c.trainerName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div>
      {clients.length > 5 && (
        <div className="relative mb-3 animate-fade-up">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อลูกเทรน, username, หรือเทรนเนอร์..."
            className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          ไม่พบลูกเทรนที่ตรงกับ &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase">
            <span>ชื่อ</span>
            <span>ติดต่อ</span>
            <span>เทรนเนอร์</span>
            <span />
          </div>
          {filtered.map((c, i) => (
            <Link
              key={c.id}
              href={`/owner/clients/${c.id}`}
              style={{ "--stagger": Math.min(i, 8) } as React.CSSProperties}
              className="animate-fade-up group grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-1 sm:gap-4 px-5 py-3.5 border-b border-border last:border-0 items-center hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold overflow-hidden">
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
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 truncate">
                    {c.fullName}
                    {c.nickname && (
                      <span className="text-muted-foreground font-normal text-sm">
                        ({c.nickname})
                      </span>
                    )}
                    {!c.active && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        ปิด
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">@{c.username}</div>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground min-w-0">
                {c.email && <span className="truncate">{c.email}</span>}
                {c.phone && <span className="truncate">{c.phone}</span>}
                {!c.email && !c.phone && <span>—</span>}
              </div>
              <div className="text-sm">
                <span className="sm:hidden text-muted-foreground">เทรนเนอร์: </span>
                {c.trainerName ?? "—"}
              </div>
              <ChevronRight className="hidden sm:block size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
