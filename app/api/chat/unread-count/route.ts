import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ count: 0 });

  if (user.role === "TRAINER") {
    const [row] = await db
      .select({ c: sql<number>`count(*)` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.trainerId, user.id),
          isNull(chatMessages.readByTrainerAt),
          isNull(chatMessages.deletedAt),
        ),
      );
    return NextResponse.json({ count: Number(row?.c ?? 0) });
  }

  if (user.role === "CLIENT") {
    const [row] = await db
      .select({ c: sql<number>`count(*)` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.clientId, user.id),
          isNull(chatMessages.readByClientAt),
          isNull(chatMessages.deletedAt),
        ),
      );
    return NextResponse.json({ count: Number(row?.c ?? 0) });
  }

  return NextResponse.json({ count: 0 });
}
