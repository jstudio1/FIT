import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { MenuAdminForm } from "@/components/menu-admin-form";

export const dynamic = "force-dynamic";

export default async function NewMenuItemPage() {
  await requireRole("OWNER");
  const { maxUploadSizeMb } = await getSiteSettings();

  return (
    <>
      <Link
        href="/owner/menu"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้าจัดการเมนู
      </Link>
      <PageHeader title="เพิ่มเมนูใหม่" description="กรอกข้อมูลแล้วบันทึก จากนั้นค่อยใส่รูปได้" />
      <MenuAdminForm initial={null} maxUploadSizeMb={maxUploadSizeMb} />
    </>
  );
}
