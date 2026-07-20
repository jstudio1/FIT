"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { broadcastToTrainersAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BroadcastForm() {
  const [state, formAction, pending] = useActionState(
    broadcastToTrainersAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 space-y-4 max-w-xl"
    >
      <div>
        <Label htmlFor="title">หัวข้อ</Label>
        <Input
          id="title"
          name="title"
          placeholder="เช่น ปิดปรับปรุงระบบวันอาทิตย์"
          required
        />
      </div>
      <div>
        <Label htmlFor="message">ข้อความ</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="รายละเอียดที่ต้องการแจ้งเทรนเนอร์..."
          className="min-h-24"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="activeOnly" defaultChecked className="size-4" />
        ส่งเฉพาะเทรนเนอร์ที่ใช้งานอยู่
      </label>
      <Button type="submit" disabled={pending}>
        <Megaphone className="size-4" />
        {pending ? "กำลังส่ง..." : "ส่งประกาศ"}
      </Button>
    </form>
  );
}
