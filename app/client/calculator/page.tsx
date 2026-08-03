import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { BmiTdeeCalculator } from "@/components/bmi-tdee-calculator";

export const dynamic = "force-dynamic";

export default async function ClientCalculatorPage() {
  await requireRole("CLIENT");

  return (
    <>
      <PageHeader
        title="คำนวณ BMI / TDEE"
        description="กรอกข้อมูลของคุณเองหรือฝากเพื่อนคำนวณก็ได้"
      />
      <div className="max-w-md">
        <BmiTdeeCalculator />
      </div>
    </>
  );
}
