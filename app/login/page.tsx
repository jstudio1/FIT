"use client";

import { useActionState } from "react";
import { Dumbbell, LogIn } from "lucide-react";
import { loginAction } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
            <Dumbbell className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Trainner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ระบบจัดการลูกเทรนสำหรับเทรนเนอร์
          </p>
        </div>

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

        <p className="text-center text-xs text-muted-foreground mt-6">
          ไม่สามารถสมัครเองได้ — บัญชีถูกสร้างโดยเทรนเนอร์หรือผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
}
