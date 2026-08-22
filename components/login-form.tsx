"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-6">
      <h2 className="font-semibold text-lg mb-4">เข้าสู่ระบบ</h2>
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="username">ชื่อผู้ใช้</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="username"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">รหัสผ่าน</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        {state?.error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          <LogIn className="size-4" />
          {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </Button>
      </form>
    </div>
  );
}
