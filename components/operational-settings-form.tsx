"use client";

import { useActionState, useEffect } from "react";
import { CalendarClock, Timer, MessageSquareText, Trash2, Upload, Save } from "lucide-react";
import { saveOperationalSettingsAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function OperationalSettingsForm({
  bookingCancelWindowHours,
  sessionDurationMin,
  chatMaxMessageLength,
  chatDeleteWindowMin,
  maxUploadSizeMb,
}: {
  bookingCancelWindowHours: number;
  sessionDurationMin: number;
  chatMaxMessageLength: number;
  chatDeleteWindowMin: number;
  maxUploadSizeMb: number;
}) {
  const [state, formAction, pending] = useActionState(saveOperationalSettingsAction, null);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 space-y-5"
    >
      <div>
        <h3 className="font-semibold text-sm">ค่าดำเนินงาน</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          ค่าที่เคยฝังตายตัวในโค้ด ย้ายมาปรับได้จากตรงนี้ — มีผลทั้งฝั่งเทรนเนอร์และลูกเทรนทันที
        </p>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex items-start gap-2.5">
          <CalendarClock className="size-4.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <Label htmlFor="bookingCancelWindowHours" className="text-sm font-medium">
              ยกเลิกนัดล่วงหน้าอย่างน้อย (ชั่วโมง)
            </Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              ลูกเทรนยกเลิกนัดเองไม่ได้ถ้าเหลือเวลาน้อยกว่านี้
            </p>
            <Input
              id="bookingCancelWindowHours"
              name="bookingCancelWindowHours"
              type="number"
              min={1}
              max={168}
              defaultValue={bookingCancelWindowHours}
              className="max-w-32"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Timer className="size-4.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <Label htmlFor="sessionDurationMin" className="text-sm font-medium">
              ความยาวคาบเทรนมาตรฐาน (นาที)
            </Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              ใช้คำนวณ &ldquo;เกินเวลา&rdquo; ตอนจับเวลาเทรนจริง — ถ้าใช้เวลาไม่ตรงนี้ เทรนเนอร์ต้องระบุเหตุผล
            </p>
            <Input
              id="sessionDurationMin"
              name="sessionDurationMin"
              type="number"
              min={1}
              max={480}
              defaultValue={sessionDurationMin}
              className="max-w-32"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <MessageSquareText className="size-4.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <Label htmlFor="chatMaxMessageLength" className="text-sm font-medium">
              ความยาวข้อความแชทสูงสุด (ตัวอักษร)
            </Label>
            <p className="text-xs text-muted-foreground mb-1.5">จำกัดทั้งข้อความและแคปชันรูปภาพในแชท</p>
            <Input
              id="chatMaxMessageLength"
              name="chatMaxMessageLength"
              type="number"
              min={1}
              max={10000}
              defaultValue={chatMaxMessageLength}
              className="max-w-32"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Trash2 className="size-4.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <Label htmlFor="chatDeleteWindowMin" className="text-sm font-medium">
              ลบข้อความแชทของตัวเองได้ภายใน (นาที)
            </Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              เกินเวลานี้แล้วจะลบข้อความที่ส่งไปแล้วไม่ได้อีก
            </p>
            <Input
              id="chatDeleteWindowMin"
              name="chatDeleteWindowMin"
              type="number"
              min={1}
              max={1440}
              defaultValue={chatDeleteWindowMin}
              className="max-w-32"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Upload className="size-4.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <Label htmlFor="maxUploadSizeMb" className="text-sm font-medium">
              ขนาดไฟล์รูปภาพสูงสุด (MB)
            </Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              ใช้ร่วมกันทุกจุดที่อัปโหลดรูป — รูปแชท, เมนูแนะนำ, รูปอาหาร, รูปโปรไฟล์, รูปป็อปอัพ
            </p>
            <Input
              id="maxUploadSizeMb"
              name="maxUploadSizeMb"
              type="number"
              min={1}
              max={50}
              defaultValue={maxUploadSizeMb}
              className="max-w-32"
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? "กำลังบันทึก..." : "บันทึกค่าดำเนินงาน"}
      </Button>
    </form>
  );
}
