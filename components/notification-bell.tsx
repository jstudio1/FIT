"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type Item = {
  id: number;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      const d = await r.json();
      setItems(d.items ?? []);
      setUnread(d.unread ?? 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  async function markRead() {
    try {
      await fetch("/api/notifications", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markRead();
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative p-2 rounded-md hover:bg-muted"
        aria-label="การแจ้งเตือน"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-auto rounded-lg border border-border bg-card shadow-lg z-50">
            <div className="px-4 py-2.5 border-b border-border font-semibold text-sm sticky top-0 bg-card">
              การแจ้งเตือน
            </div>
            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                ไม่มีการแจ้งเตือน
              </p>
            ) : (
              items.map((i) => (
                <div
                  key={i.id}
                  className="px-4 py-2.5 border-b border-border last:border-0"
                >
                  <div className="text-sm font-medium">{i.title}</div>
                  {i.message && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {i.message}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(i.createdAt).toLocaleString("th-TH")}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
