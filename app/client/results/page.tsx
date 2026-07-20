import { format } from "date-fns";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionResults } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { ClientResults, type ResultRow } from "@/components/client-results";

export const dynamic = "force-dynamic";

export default async function ClientResultsPage() {
  const client = await requireRole("CLIENT");

  const rows = await db
    .select()
    .from(sessionResults)
    .where(eq(sessionResults.clientId, client.id))
    .orderBy(asc(sessionResults.measuredAt));

  const results: ResultRow[] = rows.map((r) => ({
    id: r.id,
    dateLabel: format(r.measuredAt, "dd/MM/yyyy"),
    dateChart: format(r.measuredAt, "d/M"),
    weight: r.weight,
    waist: r.waist,
    muscleMass: r.muscleMass,
    bodyFat: r.bodyFat,
    phase: r.phase,
    note: r.note,
  }));

  return (
    <>
      <PageHeader
        title="ผลลัพธ์"
        description="บันทึกผลหลังเทรน (น้ำหนัก/รอบเอว/มวลกล้าม/ไขมัน) และดูแนวโน้ม"
      />
      <ClientResults results={results} />
    </>
  );
}
