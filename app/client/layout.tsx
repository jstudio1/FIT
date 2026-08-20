import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { AppShell } from "@/components/app-shell";
import { PopupAnnouncement } from "@/components/popup-announcement";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("CLIENT");
  const settings = await getSiteSettings();
  const hiddenHrefs = [
    ...(settings.chatEnabled ? [] : ["/client/chat"]),
    ...(settings.gamificationEnabled ? [] : ["/client/points"]),
  ];

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
