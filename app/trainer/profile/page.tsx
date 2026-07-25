import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { computeTrainerSteps } from "@/lib/profile-progress";
import { PageHeader } from "@/components/page-header";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileProgress } from "@/components/profile-progress";
import { ProfileInfoForm } from "@/components/profile-info-form";
import { ChangePasswordForm } from "@/components/change-password-form";

export const dynamic = "force-dynamic";

export default async function TrainerProfilePage() {
  const user = await requireRole("TRAINER");

  const steps = computeTrainerSteps(user);

  return (
    <>
      <PageHeader title="โปรไฟล์ของฉัน" description="จัดการข้อมูลส่วนตัวและบัญชี" />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-5">
          <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 flex flex-col items-center">
            <AvatarUploader
              userId={user.id}
              fullName={user.fullName}
              hasAvatar={!!user.avatarPath}
            />
            <div className="text-center mt-3">
              <div className="font-semibold">{user.fullName}</div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-border w-full justify-center">
              <CalendarClock className="size-3.5" />
              สร้างบัญชีเมื่อ {format(user.createdAt, "d MMM yyyy")}
            </div>
          </div>

          <ProfileProgress steps={steps} href="/trainer/profile" />
        </div>

        <div className="space-y-5">
          <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
            <h3 className="font-semibold mb-4">ข้อมูลส่วนตัว</h3>
            <ProfileInfoForm
              fullName={user.fullName}
              nickname={user.nickname}
              email={user.email}
              phone={user.phone}
              bio={user.bio}
              showBio
            />
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
            <h3 className="font-semibold mb-4">เปลี่ยนรหัสผ่าน</h3>
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </>
  );
}
