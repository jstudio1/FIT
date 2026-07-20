import { getSiteSettings } from "@/lib/settings";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { SiteSettingsForm } from "@/components/site-settings-form";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  await requireRole("OWNER");
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeader
        title="ตั้งค่าเว็บไซต์"
        description="ชื่อเว็บ, SEO และข้อมูลติดต่อ"
      />
      <SiteSettingsForm settings={settings} />
    </>
  );
}
