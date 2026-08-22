import { requireRole } from "@/lib/authz";
import { getRandomMenus } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";
import { FitGamesPanel } from "@/components/fit-games-panel";

export const dynamic = "force-dynamic";

export default async function ClientGamesPage() {
  await requireRole("CLIENT");

  const memoryMenus = await getRandomMenus(8);

  return (
    <>
      <PageHeader
        title="FitGame"
        description="มินิเกมคลายเครียดสั้นๆ ระหว่างพักจากการเทรน"
      />
      <div className="max-w-2xl mx-auto">
        <FitGamesPanel memoryMenus={memoryMenus} />
      </div>
    </>
  );
}
