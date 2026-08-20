"use client";

import { useEffect, useState } from "react";

/** ตัวเลขแจ้งเตือนข้อความแชทที่ยังไม่อ่าน — โผล่ข้างเมนู "แชท" ในไซด์บาร์ */
export function ChatNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/chat/unread-count", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        /* เงียบไว้ — poll รอบถัดไปค่อยลองใหม่ */
      }
    }
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold flex items-center justify-center">
      {count > 9 ? "9+" : count}
    </span>
  );
}
