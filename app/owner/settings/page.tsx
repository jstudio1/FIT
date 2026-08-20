import { getSiteSettings } from "@/lib/settings";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { SiteSettingsForm } from "@/components/site-settings-form";
import { PopupSettingsForm } from "@/components/popup-settings-form";
import { SystemTogglesForm } from "@/components/system-toggles-form";
import { OperationalSettingsForm } from "@/components/operational-settings-form";
import { IntegrationsStatus } from "@/components/integrations-status";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  await requireRole("OWNER");
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeader
        title="ตั้งค่าเว็บไซต์"
        description="ชื่อเว็บ, SEO, ระบบต่างๆ และ API ที่ใช้อยู่"
      />
      <div className="space-y-6">
        <SiteSettingsForm settings={settings} />
        <PopupSettingsForm
          popupEnabled={settings.popupEnabled}
          popupTitle={settings.popupTitle}
          popupLinkUrl={settings.popupLinkUrl}
          hasImage={!!settings.popupImagePath}
          maxUploadSizeMb={settings.maxUploadSizeMb}
        />
        <SystemTogglesForm
          chatEnabled={settings.chatEnabled}
          gamificationEnabled={settings.gamificationEnabled}
          pointsTrainingCompleted={settings.pointsTrainingCompleted}
          pointsFoodLogged={settings.pointsFoodLogged}
          pointsBadgeBonus={settings.pointsBadgeBonus}
        />
        <OperationalSettingsForm
          bookingCancelWindowHours={settings.bookingCancelWindowHours}
          sessionDurationMin={settings.sessionDurationMin}
          chatMaxMessageLength={settings.chatMaxMessageLength}
          chatDeleteWindowMin={settings.chatDeleteWindowMin}
          maxUploadSizeMb={settings.maxUploadSizeMb}
        />
        <IntegrationsStatus />
      </div>
    </>
  );
}
