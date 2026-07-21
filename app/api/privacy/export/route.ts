import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, bookingCancellations, clientProfiles, foodComments, foodLogs, privacyConsents, privacyRequests, sessionResults } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [profile, results, appointments, cancellations, meals, comments, consent, requests] = await Promise.all([
    db.select().from(clientProfiles).where(eq(clientProfiles.userId, user.id)),
    db.select().from(sessionResults).where(eq(sessionResults.clientId, user.id)),
    db.select().from(bookings).where(eq(bookings.clientId, user.id)),
    db.select().from(bookingCancellations).where(eq(bookingCancellations.clientId, user.id)),
    db.select().from(foodLogs).where(eq(foodLogs.clientId, user.id)),
    db.select().from(foodComments).innerJoin(foodLogs, and(eq(foodComments.foodLogId, foodLogs.id), eq(foodLogs.clientId, user.id))),
    db.select().from(privacyConsents).where(eq(privacyConsents.userId, user.id)),
    db.select().from(privacyRequests).where(eq(privacyRequests.userId, user.id)),
  ]);
  await db.insert(privacyRequests).values({ userId: user.id, requestType: "EXPORT", status: "COMPLETED", completedAt: new Date() });
  await writeAudit({ actorId: user.id, action: "PERSONAL_DATA_EXPORTED", resourceType: "PRIVACY_REQUEST", subjectUserId: user.id });
  return NextResponse.json({ exportedAt: new Date().toISOString(), account: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, createdAt: user.createdAt }, profile, results, appointments, cancellations, meals, comments, consent, requests }, {
    headers: { "Content-Disposition": `attachment; filename="trainner-data-${user.id}.json"`, "Cache-Control": "no-store" },
  });
}
