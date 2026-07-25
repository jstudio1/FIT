"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { createClientAction } from "@/app/_actions/trainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClientForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClientAction, null);
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
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto mb-6">
        <UserPlus className="size-4" />
        เพิ่มลูกเทรน
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="font-semibold text-sm sm:text-base">สร้างบัญชีลูกเทรนใหม่</h3>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 -m-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <form
        ref={formRef}
        action={formAction}
        className="grid gap-3 sm:gap-4 sm:grid-cols-3"
      >
        <div>
          <Label htmlFor="c-fullName">ชื่อ-นามสกุล</Label>
          <Input id="c-fullName" name="fullName" placeholder="เช่น มานี รักดี" required />
        </div>
        <div>
          <Label htmlFor="c-username">ชื่อผู้ใช้ (username)</Label>
          <Input id="c-username" name="username" placeholder="manee" required />
        </div>
        <div>
          <Label htmlFor="c-password">รหัสผ่าน</Label>
          <Input
            id="c-password"
            name="password"
            type="text"
            placeholder="อย่างน้อย 12 ตัวอักษร"
            required
          />
        </div>
        <div className="sm:col-span-3 flex flex-col sm:flex-row gap-2">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "กำลังสร้าง..." : "สร้างบัญชี"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto"
          >
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
}
