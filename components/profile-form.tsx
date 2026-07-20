"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { saveProfileAction } from "@/app/_actions/trainer";
import type { ClientProfile } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

const v = (x: unknown) => (x == null ? "" : String(x));

export function ProfileForm({
  clientId,
  profile,
}: {
  clientId: number;
  profile: ClientProfile | null;
}) {
  const [state, formAction, pending] = useActionState(saveProfileAction, null);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="clientId" value={clientId} />

      <Section title="เป้าหมาย & สุขภาพ">
        <div className="sm:col-span-2">
          <Label htmlFor="goals">เป้าหมายของลูกเทรน</Label>
          <Textarea
            id="goals"
            name="goals"
            defaultValue={v(profile?.goals)}
            placeholder="เช่น ลดน้ำหนัก 5 กก. ใน 3 เดือน / เพิ่มกล้ามเนื้อ"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="healthHistory">ประวัติสุขภาพ / โรคประจำตัว / อาการบาดเจ็บ</Label>
          <Textarea
            id="healthHistory"
            name="healthHistory"
            defaultValue={v(profile?.healthHistory)}
            placeholder="เช่น ปวดเข่าซ้าย, ความดันสูง, ไม่มี"
          />
        </div>
      </Section>

      <Section title="ข้อมูลร่างกายตอนเริ่มต้น">
        <div>
          <Label htmlFor="startWeight">น้ำหนัก (กก.)</Label>
          <Input id="startWeight" name="startWeight" type="number" step="0.1" defaultValue={v(profile?.startWeight)} />
        </div>
        <div>
          <Label htmlFor="startHeight">ส่วนสูง (ซม.)</Label>
          <Input id="startHeight" name="startHeight" type="number" step="0.1" defaultValue={v(profile?.startHeight)} />
        </div>
        <div>
          <Label htmlFor="startWaist">รอบเอว (ซม.)</Label>
          <Input id="startWaist" name="startWaist" type="number" step="0.1" defaultValue={v(profile?.startWaist)} />
        </div>
        <div>
          <Label htmlFor="startMuscleMass">มวลกล้ามเนื้อ (กก.)</Label>
          <Input id="startMuscleMass" name="startMuscleMass" type="number" step="0.1" defaultValue={v(profile?.startMuscleMass)} />
        </div>
        <div>
          <Label htmlFor="startBodyFat">ไขมัน (%)</Label>
          <Input id="startBodyFat" name="startBodyFat" type="number" step="0.1" defaultValue={v(profile?.startBodyFat)} />
        </div>
      </Section>

      <Section title="พื้นฐาน & ไลฟ์สไตล์">
        <div className="sm:col-span-2">
          <Label htmlFor="exerciseBackground">พื้นฐานการออกกำลังกาย</Label>
          <Textarea
            id="exerciseBackground"
            name="exerciseBackground"
            defaultValue={v(profile?.exerciseBackground)}
            placeholder="เช่น เคยวิ่งบ้าง ไม่เคยเล่นเวท"
          />
        </div>
        <div>
          <Label htmlFor="sleepPattern">การนอน</Label>
          <Input id="sleepPattern" name="sleepPattern" defaultValue={v(profile?.sleepPattern)} placeholder="เช่น นอน 6 ชม. เข้านอนดึก" />
        </div>
        <div>
          <Label htmlFor="workPattern">ลักษณะการทำงาน</Label>
          <Input id="workPattern" name="workPattern" defaultValue={v(profile?.workPattern)} placeholder="เช่น นั่งออฟฟิศ / งานยืน" />
        </div>
        <div>
          <Label htmlFor="daysPerWeek">ออกกำลังกายได้ (วัน/สัปดาห์)</Label>
          <Input id="daysPerWeek" name="daysPerWeek" type="number" min="0" max="7" defaultValue={v(profile?.daysPerWeek)} />
        </div>
        <div>
          <Label htmlFor="mealsPerDay">มื้ออาหาร (มื้อ/วัน)</Label>
          <Input id="mealsPerDay" name="mealsPerDay" type="number" min="0" max="10" defaultValue={v(profile?.mealsPerDay)} />
        </div>
        <div>
          <Label htmlFor="alcoholFrequency">ดื่มแอลกอฮอล์บ่อยแค่ไหน</Label>
          <Input id="alcoholFrequency" name="alcoholFrequency" defaultValue={v(profile?.alcoholFrequency)} placeholder="เช่น ไม่ดื่ม / สัปดาห์ละครั้ง" />
        </div>
        <div>
          <Label htmlFor="disciplineNote">วินัยการออกกำลังกาย</Label>
          <Input id="disciplineNote" name="disciplineNote" defaultValue={v(profile?.disciplineNote)} placeholder="เช่น สม่ำเสมอ / ขาดบ่อย" />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "กำลังบันทึก..." : "บันทึกประวัติ"}
        </Button>
      </div>
    </form>
  );
}
