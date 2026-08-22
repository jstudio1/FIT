import { getSiteSettings } from "@/lib/settings";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";
import { SiteSettingsForm } from "@/components/site-settings-form";
import { PopupSettingsForm } from "@/components/popup-settings-form";
import { SystemTogglesForm } from "@/components/system-toggles-form";
import { OperationalSettingsForm } from "@/components/operational-settings-form";
import { LoginThemeForm } from "@/components/login-theme-form";
import { IntegrationsStatus } from "@/components/integrations-status";

export const dynamic = "force-dynamic";

function Section({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{ "--stagger": index } as React.CSSProperties}
      className="animate-fade-up scroll-mt-6"
    >
      {children}
    </section>
  );
}

export default async function OwnerSettingsPage() {
  await requireRole("OWNER");
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeader
        title="ตั้งค่าเว็บไซต์"
        description="ชื่อเว็บ, SEO, ระบบต่างๆ และ API ที่ใช้อยู่"
      />
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:items-start">
        <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-3 shadow-sm">
            <SettingsNav />
          </div>
        </aside>

        <div className="space-y-6 max-w-2xl">
          <Section id="site" index={0}>
            <SiteSettingsForm settings={settings} />
          </Section>
          <Section id="popup" index={1}>
            <PopupSettingsForm
              popupEnabled={settings.popupEnabled}
              popupTitle={settings.popupTitle}
              popupLinkUrl={settings.popupLinkUrl}
              hasImage={!!settings.popupImagePath}
              maxUploadSizeMb={settings.maxUploadSizeMb}
            />
          </Section>
          <Section id="toggles" index={2}>
            <SystemTogglesForm
              chatEnabled={settings.chatEnabled}
              gamificationEnabled={settings.gamificationEnabled}
              pointsTrainingCompleted={settings.pointsTrainingCompleted}
              pointsFoodLogged={settings.pointsFoodLogged}
              pointsBadgeBonus={settings.pointsBadgeBonus}
            />
          </Section>
          <Section id="operational" index={3}>
            <OperationalSettingsForm
              bookingCancelWindowHours={settings.bookingCancelWindowHours}
              sessionDurationMin={settings.sessionDurationMin}
              chatMaxMessageLength={settings.chatMaxMessageLength}
              chatDeleteWindowMin={settings.chatDeleteWindowMin}
              maxUploadSizeMb={settings.maxUploadSizeMb}
            />
          </Section>
          <Section id="login-theme" index={4}>
            <LoginThemeForm current={settings.loginTheme} />
          </Section>
          <Section id="integrations" index={5}>
            <IntegrationsStatus />
          </Section>
        </div>
      </div>
    </>
  );
}
