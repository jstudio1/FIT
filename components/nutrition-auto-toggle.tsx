"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { toggleAutoNutritionAction } from "@/app/_actions/nutrition-settings";
import { cn } from "@/lib/utils";

export function NutritionAutoToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const res = await toggleAutoNutritionAction(!enabled);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "สำเร็จ");
      router.refresh();
    });

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-4 sm:p-5 mb-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <div className="text-sm font-medium">การตั้งค่าตรวจอาหาร</div>
            <div className="text-xs text-muted-foreground">
              {enabled
                ? "เปิด: AI คำนวณแคลอรี่ให้อัตโนมัติและส่งลูกเทรนทันที"
                : "ปิด: คุณกรอกข้อมูลโภชนาการเองแบบเดิม"}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={toggle}
          aria-pressed={enabled}
          className={cn(
            "relative shrink-0 h-7 w-12 rounded-full transition-colors disabled:opacity-50",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
              enabled && "translate-x-5",
            )}
          />
        </button>
      </div>
    </div>
  );
}
