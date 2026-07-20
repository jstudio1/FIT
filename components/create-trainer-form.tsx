"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { createTrainerAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateTrainerForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTrainerAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
      setOpen(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        เพิ่มเทรนเนอร์
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">สร้างบัญชีเทรนเนอร์ใหม่</h3>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <form
        ref={formRef}
        action={formAction}
        className="grid gap-4 sm:grid-cols-3"
      >
        <div>
          <Label htmlFor="t-fullName">ชื่อ-นามสกุล</Label>
          <Input id="t-fullName" name="fullName" placeholder="เช่น สมชาย ใจดี" required />
        </div>
        <div>
          <Label htmlFor="t-username">ชื่อผู้ใช้ (username)</Label>
          <Input id="t-username" name="username" placeholder="somchai" required />
        </div>
        <div>
          <Label htmlFor="t-password">รหัสผ่าน</Label>
          <Input
            id="t-password"
            name="password"
            type="text"
            placeholder="อย่างน้อย 6 ตัวอักษร"
            required
          />
        </div>
        <div className="sm:col-span-3 flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "กำลังสร้าง..." : "สร้างบัญชี"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
}
