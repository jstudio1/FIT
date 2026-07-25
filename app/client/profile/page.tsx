import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { CalendarClock, HeartPulse } from "lucide-react";
import { db } from "@/lib/db";
import { clientProfiles } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { computeClientSteps } from "@/lib/profile-progress";
import { PageHeader } from "@/components/page-header";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileProgress } from "@/components/profile-progress";
import { ProfileInfoForm } from "@/components/profile-info-form";
import { ChangePasswordForm } from "@/components/change-password-form";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage() {
  const user = await requireRole("CLIENT");

  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, user.id))
    .limit(1);
  const hasHealthProfile = Boolean(profile?.goals || profile?.healthHistory);

  const steps = computeClientSteps(user, hasHealthProfile);

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

          <ProfileProgress steps={steps} href="/client/profile" />
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
            />
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse className="size-4.5 text-primary" />
              <h3 className="font-semibold">ข้อมูลสุขภาพ/เป้าหมาย</h3>
            </div>
            {hasHealthProfile ? (
              <div className="space-y-3 text-sm">
                {profile?.goals && (
                  <div>
                    <div className="text-xs text-muted-foreground">เป้าหมาย</div>
                    <p>{profile.goals}</p>
                  </div>
                )}
                {profile?.healthHistory && (
                  <div>
                    <div className="text-xs text-muted-foreground">ประวัติสุขภาพ</div>
                    <p>{profile.healthHistory}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                ยังไม่มีข้อมูล — เทรนเนอร์ของคุณจะเป็นผู้กรอกข้อมูลนี้ให้
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              ส่วนนี้แก้ไขได้โดยเทรนเนอร์ของคุณเท่านั้น
            </p>
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
