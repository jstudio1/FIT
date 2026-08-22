import { and, desc, eq, inArray } from "drizzle-orm";
import { differenceInYears, format } from "date-fns";
import { db } from "@/lib/db";
import { users, clientProfiles, sessionResults, calculatorResults } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { HealthToolsPanel } from "@/components/health-tools";
import type {
  CalculatorClientOption,
  SavedCalculatorResult,
} from "@/components/bmi-tdee-calculator";

export const dynamic = "force-dynamic";

export default async function TrainerHealthToolsPage() {
  const trainer = await requireRole("TRAINER");

  const clients = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.role, "CLIENT"), eq(users.trainerId, trainer.id)));
  const clientIds = clients.map((c) => c.id);

  const profileRows = clientIds.length
    ? await db
        .select({
          userId: clientProfiles.userId,
          startHeight: clientProfiles.startHeight,
          startWeight: clientProfiles.startWeight,
          birthDate: clientProfiles.birthDate,
        })
        .from(clientProfiles)
        .where(inArray(clientProfiles.userId, clientIds))
    : [];
  const profileMap = new Map(profileRows.map((p) => [p.userId, p]));

  const resultRows = clientIds.length
    ? await db
        .select({
          clientId: sessionResults.clientId,
          weight: sessionResults.weight,
        })
        .from(sessionResults)
        .where(inArray(sessionResults.clientId, clientIds))
        .orderBy(desc(sessionResults.measuredAt))
    : [];
  const latestWeightMap = new Map<number, number>();
  for (const r of resultRows) {
    if (!latestWeightMap.has(r.clientId) && r.weight != null) {
      latestWeightMap.set(r.clientId, r.weight);
    }
  }

  const bmiClients: CalculatorClientOption[] = clients.map((c) => {
    const profile = profileMap.get(c.id);
    const age = profile?.birthDate
      ? differenceInYears(new Date(), new Date(`${profile.birthDate}T00:00:00`))
      : null;
    return {
      id: c.id,
      name: c.fullName,
      height: profile?.startHeight ?? null,
      weight: latestWeightMap.get(c.id) ?? profile?.startWeight ?? null,
      age,
    };
  });

  const clientNameMap = new Map(clients.map((c) => [c.id, c.fullName]));
  const savedRows = await db
    .select()
    .from(calculatorResults)
    .where(eq(calculatorResults.createdBy, trainer.id))
    .orderBy(desc(calculatorResults.createdAt))
    .limit(30);
  const bmiSavedResults: SavedCalculatorResult[] = savedRows.map((r) => ({
    id: r.id,
    dateLabel: format(r.createdAt, "d MMM yy HH:mm"),
    clientName: r.clientId ? (clientNameMap.get(r.clientId) ?? "—") : null,
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
        <HealthToolsPanel bmiClients={bmiClients} bmiSavedResults={bmiSavedResults} />
      </div>
    </>
  );
}
