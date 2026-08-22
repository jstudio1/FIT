import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { calculatorResults } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { HealthToolsPanel } from "@/components/health-tools";
import type { SavedCalculatorResult } from "@/components/bmi-tdee-calculator";

export const dynamic = "force-dynamic";

export default async function ClientHealthToolsPage() {
  const client = await requireRole("CLIENT");

  const savedRows = await db
    .select()
    .from(calculatorResults)
    .where(eq(calculatorResults.createdBy, client.id))
    .orderBy(desc(calculatorResults.createdAt))
    .limit(30);
  const bmiSavedResults: SavedCalculatorResult[] = savedRows.map((r) => ({
    id: r.id,
    dateLabel: format(r.createdAt, "d MMM yy HH:mm"),
    clientName: null,
    goal: r.goal,
    calories: r.calories,
    protein: r.protein,
    carb: r.carb,
    fat: r.fat,
  }));

  return (
    <>
      <PageHeader
        title="เครื่องมือสุขภาพ"
        description="BMI/TDEE, % ไขมัน, น้ำหนักยกสูงสุด, โซนหัวใจ, แคลอรี่ที่เผา, น้ำที่ควรดื่ม"
      />
      <div className="max-w-4xl">
        <HealthToolsPanel bmiSavedResults={bmiSavedResults} />
      </div>
    </>
  );
}
