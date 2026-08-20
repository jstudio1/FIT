import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, clientStreaks, pointEvents } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { getGamificationProfile } from "@/lib/gamification";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { PointsPanel, type LeaderboardRow, type BadgeItem } from "@/components/points-panel";
import { FeatureDisabled } from "@/components/feature-disabled";

export const dynamic = "force-dynamic";

export default async function ClientPointsPage() {
  const client = await requireRole("CLIENT");
  const settings = await getSiteSettings();

  if (!settings.gamificationEnabled) {
    return (
      <>
        <PageHeader title="แต้มสะสม" description="แต้ม, Streak, Badge และ Leaderboard ของคุณ" />
        <FeatureDisabled message="ระบบแต้มสะสมถูกปิดใช้งานอยู่ในขณะนี้" />
      </>
    );
  }

  const profile = await getGamificationProfile(client.id);

  const badges: BadgeItem[] = profile.badges.map((b) => ({
    code: b.code,
    label: b.label,
    description: b.description,
    icon: b.icon,
    earnedAt: b.earnedAt ? b.earnedAt.toISOString() : null,
  }));

  let leaderboard: LeaderboardRow[] = [];
  if (client.trainerId) {
    const peers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        nickname: users.nickname,
        streak: clientStreaks.currentStreak,
        optIn: clientStreaks.leaderboardOptIn,
      })
      .from(users)
      .innerJoin(clientStreaks, eq(clientStreaks.clientId, users.id))
      .where(
        and(
          eq(users.role, "CLIENT"),
          eq(users.trainerId, client.trainerId),
          eq(clientStreaks.leaderboardOptIn, true),
        ),
      );

    const peerIds = peers.map((p) => p.id);
    const pointsRows = peerIds.length
      ? await db
          .select({ clientId: pointEvents.clientId, total: sql<number>`sum(${pointEvents.points})` })
          .from(pointEvents)
          .where(inArray(pointEvents.clientId, peerIds))
          .groupBy(pointEvents.clientId)
      : [];
    const pointsMap = new Map(pointsRows.map((r) => [r.clientId, Number(r.total)]));

    leaderboard = peers
      .map((p) => ({
        id: p.id,
        name: p.nickname ?? p.fullName,
        points: pointsMap.get(p.id) ?? 0,
        streak: p.streak,
        isMe: p.id === client.id,
      }))
      .sort((a, b) => b.points - a.points || b.streak - a.streak);
  }

  return (
    <>
      <PageHeader title="แต้มสะสม" description="แต้ม, Streak, Badge และ Leaderboard ของคุณ" />
      <PointsPanel
        totalPoints={profile.totalPoints}
        currentStreak={profile.currentStreak}
        longestStreak={profile.longestStreak}
        leaderboardOptIn={profile.leaderboardOptIn}
        badges={badges}
        leaderboard={leaderboard}
      />
    </>
  );
}
