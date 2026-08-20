import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { AppShell } from "@/components/app-shell";
import { PopupAnnouncement } from "@/components/popup-announcement";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("TRAINER");
  const settings = await getSiteSettings();
  const hiddenHrefs = settings.chatEnabled ? [] : ["/trainer/chat"];

  return (
    <>
      {settings.popupEnabled && settings.popupImagePath && (
        <PopupAnnouncement
          title={settings.popupTitle}
          linkUrl={settings.popupLinkUrl}
          seenKey={settings.popupImagePath}
        />
      )}
      <AppShell
        role={user.role}
        name={user.fullName}
        userId={user.id}
        avatarPath={user.avatarPath}
        hiddenHrefs={hiddenHrefs}
      >
        {children}
      </AppShell>
    </>
  );
}
