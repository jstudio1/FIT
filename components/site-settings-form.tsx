"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { saveSiteSettingsAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  siteName: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string | null;
  contactEmail: string | null;
};

export function SiteSettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(
    saveSiteSettingsAction,
    null,
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 space-y-4 max-w-2xl"
    >
      <div>
        <Label htmlFor="siteName">ชื่อเว็บไซต์</Label>
        <Input
          id="siteName"
          name="siteName"
          defaultValue={settings.siteName}
          required
        />
      </div>
      <div>
        <Label htmlFor="metaTitle">Meta Title (ชื่อบนแท็บ/Google)</Label>
        <Input
          id="metaTitle"
          name="metaTitle"
          defaultValue={settings.metaTitle}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          แสดงเป็นชื่อหน้าเว็บและหัวข้อบนผลค้นหา
        </p>
      </div>
      <div>
        <Label htmlFor="metaDescription">Meta Description (คำอธิบาย SEO)</Label>
        <Textarea
          id="metaDescription"
          name="metaDescription"
          defaultValue={settings.metaDescription}
          className="min-h-20"
        />
      </div>
      <div>
        <Label htmlFor="keywords">Keywords (คั่นด้วย , )</Label>
        <Input
          id="keywords"
          name="keywords"
          defaultValue={settings.keywords ?? ""}
          placeholder="เทรนเนอร์, ออกกำลังกาย, ลดน้ำหนัก"
        />
      </div>
      <div>
        <Label htmlFor="contactEmail">อีเมลติดต่อ</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={settings.contactEmail ?? ""}
          placeholder="contact@example.com"
        />
      </div>
      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
      </Button>
    </form>
  );
}
