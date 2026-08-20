"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { setLeaderboardOptIn } from "@/lib/gamification";

export type Res = { error?: string; success?: string };

export async function setLeaderboardOptInAction(optIn: boolean): Promise<Res> {
  const client = await requireRole("CLIENT");
  await setLeaderboardOptIn(client.id, optIn);
  revalidatePath("/client/points");
  return { success: optIn ? "เปิด Leaderboard แล้ว" : "ปิด Leaderboard แล้ว" };
}
