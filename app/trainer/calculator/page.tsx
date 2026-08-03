import { and, desc, eq, inArray } from "drizzle-orm";
import { differenceInYears } from "date-fns";
import { db } from "@/lib/db";
import { users, clientProfiles, sessionResults } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import {
  BmiTdeeCalculator,
  type CalculatorClientOption,
} from "@/components/bmi-tdee-calculator";

export const dynamic = "force-dynamic";

export default async function TrainerCalculatorPage() {
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

  const clientOptions: CalculatorClientOption[] = clients.map((c) => {
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

  return (
    <>
      <PageHeader
        title="คำนวณ BMI / TDEE"
        description="กรอกข้อมูลลูกเทรนหรือใครก็ได้เพื่อคำนวณ"
      />
      <div className="max-w-md">
        <BmiTdeeCalculator clients={clientOptions} />
      </div>
    </>
  );
}
