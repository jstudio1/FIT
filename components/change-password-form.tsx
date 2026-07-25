"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { changeMyPasswordAction } from "@/app/_actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changeMyPasswordAction,
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
    <form ref={formRef} action={formAction} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="อย่างน้อย 12 ตัวอักษร"
          required
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        <KeyRound className="size-4" />
        {pending ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
      </Button>
    </form>
  );
}
