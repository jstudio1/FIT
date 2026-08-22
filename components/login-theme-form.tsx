"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { saveLoginThemeAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoginTheme = "simple" | "split" | "frame";

const THEMES: {
  value: LoginTheme;
  label: string;
  description: string;
  preview: React.ReactNode;
}[] = [
  {
    value: "simple",
    label: "เรียบง่าย",
    description: "การ์ดฟอร์มอยู่กลางจอ พื้นหลังไล่เฉดสีลอยเบาๆ",
    preview: (
      <div className="h-16 w-full rounded-md bg-muted/60 flex items-center justify-center">
        <div className="h-10 w-8 rounded-sm bg-primary/70" />
      </div>
    ),
  },
  {
    value: "split",
    label: "แบ่งครึ่งจอ + มือถือ",
    description: "จอกว้างแบ่งซ้าย-ขวา ฝั่งซ้ายโชว์กรอบมือถือ ฝั่งขวาเป็นฟอร์ม (มือถือจะเห็นแค่ฟอร์ม)",
    preview: (
      <div className="h-16 w-full rounded-md bg-muted/60 flex items-center justify-center gap-2 px-3">
        <div className="h-11 w-5 rounded-[3px] bg-primary/50" />
        <div className="h-10 w-8 rounded-sm bg-primary/70" />
      </div>
    ),
  },
  {
    value: "frame",
    label: "กรอบมือถือลอย",
    description: "การ์ดฟอร์มอยู่กลางจอเหมือนเดิม มีกรอบมือถือเอียงๆ ลอยอยู่ด้านข้าง (จอใหญ่เท่านั้น)",
    preview: (
      <div className="h-16 w-full rounded-md bg-muted/60 flex items-center justify-center relative overflow-hidden">
        <div className="h-10 w-8 rounded-sm bg-primary/70 z-10" />
        <div className="absolute right-2 h-9 w-4 rounded-[3px] bg-primary/40 rotate-12" />
      </div>
    ),
  },
];

export function LoginThemeForm({ current }: { current: LoginTheme }) {
  const [state, formAction, pending] = useActionState(saveLoginThemeAction, null);
  const [selected, setSelected] = useState<LoginTheme>(current);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 space-y-4"
    >
      <input type="hidden" name="loginTheme" value={selected} />
      <div>
        <h3 className="font-semibold text-sm">ธีมหน้า Login</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          เลือกรูปแบบหน้าเข้าสู่ระบบที่ทุกคนเห็นก่อนล็อกอิน
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setSelected(t.value)}
            className={cn(
              "text-left rounded-md border p-3 transition-colors",
              selected === t.value
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted",
            )}
          >
            {t.preview}
            <div className="text-sm font-medium mt-2">{t.label}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
          </button>
        ))}
      </div>

      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? "กำลังบันทึก..." : "บันทึกธีมหน้า Login"}
      </Button>
    </form>
  );
}
