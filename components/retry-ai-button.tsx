"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { retryAutoNutritionAction } from "@/app/_actions/food";

export function RetryAiButton({ foodLogId }: { foodLogId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const retry = () =>
    startTransition(async () => {
      const res = await retryAutoNutritionAction(foodLogId);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "สำเร็จ");
      router.refresh();
    });

  return (
    <button
      type="button"
      disabled={pending}
      onClick={retry}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
    >
      <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
      {pending ? "กำลังคำนวณ..." : "ลองคำนวณ AI อีกครั้ง"}
    </button>
  );
}
