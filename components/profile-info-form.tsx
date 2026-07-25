"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { updateMyProfileAction } from "@/app/_actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileInfoForm({
  fullName,
  nickname,
  email,
  phone,
  bio,
  showBio,
}: {
  fullName: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  showBio?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateMyProfileAction,
    null,
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
          <Input id="fullName" name="fullName" defaultValue={fullName} required />
        </div>
        <div>
          <Label htmlFor="nickname">ชื่อเล่น</Label>
          <Input id="nickname" name="nickname" defaultValue={nickname ?? ""} placeholder="เช่น เอ" />
        </div>
        <div>
          <Label htmlFor="email">อีเมล</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={email ?? ""}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={phone ?? ""}
            placeholder="08x-xxx-xxxx"
          />
        </div>
      </div>
      {showBio && (
        <div>
          <Label htmlFor="bio">แนะนำตัว</Label>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={bio ?? ""}
            placeholder="เล่าประสบการณ์ ความเชี่ยวชาญ หรือแนวทางการเทรนของคุณ..."
            className="min-h-24"
          />
        </div>
      )}
      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
      </Button>
    </form>
  );
}
