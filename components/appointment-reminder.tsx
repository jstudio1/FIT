"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { slotStart, hourLabel } from "@/lib/schedule";

type Upcoming = { date: string; hour: number };

/** เตือนป็อปอัพเมื่อถึงเวลานัด (client-side timer) */
export function AppointmentReminder() {
  const fired = useRef<Set<string>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/upcoming", { cache: "no-store" });
        const d = await r.json();
        timers.current.forEach((t) => clearTimeout(t));
        timers.current = [];
        const now = Date.now();
        for (const it of (d.items ?? []) as Upcoming[]) {
          const key = `${it.date}_${it.hour}`;
          if (fired.current.has(key)) continue;
          const delay = slotStart(it.date, it.hour).getTime() - now;
          if (delay > 0 && delay < 24 * 3600 * 1000) {
            timers.current.push(
              setTimeout(() => {
                fired.current.add(key);
                toast(
                  `⏰ ถึงเวลาเทรน! วันที่ ${it.date} เวลา ${hourLabel(
                    it.hour,
                  )}-${hourLabel(it.hour + 1)}`,
                  { duration: 20000 },
                );
              }, delay),
            );
          }
        }
      } catch {
        /* ignore */
      }
    }
    load();
    const poll = setInterval(load, 5 * 60 * 1000);
    return () => {
      clearInterval(poll);
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return null;
}
