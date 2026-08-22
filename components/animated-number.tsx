"use client";

import { useEffect, useRef, useState } from "react";

/** ตัวเลขไล่นับขึ้นตอนโผล่เข้าจอ (intersection observer) — ใช้กับการ์ดสถิติให้ดูมีชีวิตชีวาขึ้น */
export function AnimatedNumber({
  value,
  duration = 700,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const from = 0;
      const to = value;
      const startTime = performance.now();
      function tick(now: number) {
        const progress = Math.min(1, (now - startTime) / duration);
        // easeOutCubic
        const eased = 1 - (1 - progress) ** 3;
        setDisplay(Math.round(from + (to - from) * eased));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) run();
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}
