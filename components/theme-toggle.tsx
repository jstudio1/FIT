"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "theme";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
}

export function ThemeToggle() {
  // อ่านสถานะจริงจาก DOM หลัง mount (สคริปต์กันกะพริบใน layout ตั้งค่าไว้ให้แล้วก่อนหน้านี้)
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (dark === null) {
    // ยังไม่รู้สถานะจริง (กันการกะพริบ/mismatch) — โชว์ปุ่มเปล่าๆ ขนาดเท่ากันไปก่อน
    return <div className="size-9" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={() => {
        const next = !dark;
        setDark(next);
        applyTheme(next);
      }}
      title={dark ? "สลับเป็นโหมดเช้า" : "สลับเป็นโหมดกลางคืน"}
      className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}
