"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { commentFoodAction } from "@/app/_actions/food";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FoodCommentForm({ foodLogId }: { foodLogId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [calories, setCalories] = useState("");

  function submit() {
    const cal = calories.trim() === "" ? null : Number(calories);
    startTransition(async () => {
      const res = await commentFoodAction(
        foodLogId,
        comment.trim() || null,
        cal,
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "บันทึกแล้ว");
      setComment("");
      setCalories("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 mt-3 border-t border-border pt-3">
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="คอมเมนต์ถึงลูกเทรน..."
        className="flex-1"
      />
      <Input
        type="number"
        value={calories}
        onChange={(e) => setCalories(e.target.value)}
        placeholder="แคล"
        className="sm:w-24"
      />
      <Button onClick={submit} disabled={pending} size="sm" className="h-10">
        <Send className="size-4" />
        ส่ง
      </Button>
    </div>
  );
}
