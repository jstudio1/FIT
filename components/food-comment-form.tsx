"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { commentFoodAction } from "@/app/_actions/food";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const toNum = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function FoodCommentForm({ foodLogId }: { foodLogId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await commentFoodAction(foodLogId, {
        comment: comment.trim() || null,
        calories: toNum(calories),
        carbs: toNum(carbs),
        protein: toNum(protein),
        fat: toNum(fat),
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "บันทึกแล้ว");
      setComment("");
      setCalories("");
      setCarbs("");
      setProtein("");
      setFat("");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-2">
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="คอมเมนต์ถึงลูกเทรน..."
      />
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label className="text-[11px]">แคลอรี่</Label>
          <Input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="แคล"
          />
        </div>
        <div>
          <Label className="text-[11px]">คาร์บ (ก.)</Label>
          <Input
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="ก."
          />
        </div>
        <div>
          <Label className="text-[11px]">โปรตีน (ก.)</Label>
          <Input
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="ก."
          />
        </div>
        <div>
          <Label className="text-[11px]">ไขมัน (ก.)</Label>
          <Input
            type="number"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="ก."
          />
        </div>
      </div>
      <Button
        onClick={submit}
        disabled={pending}
        size="sm"
        className="h-9 w-full sm:w-auto"
      >
        <Send className="size-4" />
        ส่ง
      </Button>
    </div>
  );
}
