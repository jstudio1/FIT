"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { updateTrainerAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditTrainerForm({
  trainer,
}: {
  trainer: { id: number; fullName: string; username: string };
}) {
  const [state, formAction, pending] = useActionState(
    updateTrainerAction,
    null,
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={trainer.id} />
      <div>
        <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
        <Input id="fullName" name="fullName" defaultValue={trainer.fullName} required />
      </div>
      <div>
        <Label htmlFor="username">ชื่อผู้ใช้ (แก้ไม่ได้)</Label>
        <Input id="username" value={`@${trainer.username}`} disabled />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="password">รีเซ็ตรหัสผ่าน (เว้นว่างถ้าไม่เปลี่ยน)</Label>
        <Input
          id="password"
          name="password"
          type="text"
          placeholder="ตั้งรหัสใหม่ อย่างน้อย 6 ตัวอักษร"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}
