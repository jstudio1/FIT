import "server-only";

import { and, count, eq, gte, max } from "drizzle-orm";
import { db } from "./db";
import { loginAttempts } from "./db/schema";
import { privacyHash, requestIp } from "./audit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_IDENTIFIER_FAILURES = 5;
const MAX_IP_FAILURES = 20;

export async function loginKeys(username: string) {
  const ip = await requestIp();
  return {
    identifierHash: privacyHash(username.trim().toLowerCase()),
    ipHash: privacyHash(ip),
  };
}

export async function checkLoginLimit(keys: Awaited<ReturnType<typeof loginKeys>>) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byIdentifier, byIp] = await Promise.all([
    db.select({ value: count(), lastAttempt: max(loginAttempts.attemptedAt) }).from(loginAttempts).where(and(eq(loginAttempts.identifierHash, keys.identifierHash), eq(loginAttempts.success, false), gte(loginAttempts.attemptedAt, since))),
    db.select({ value: count() }).from(loginAttempts).where(and(eq(loginAttempts.ipHash, keys.ipHash), eq(loginAttempts.success, false), gte(loginAttempts.attemptedAt, since))),
  ]);
  const failures = byIdentifier[0]?.value ?? 0;
  const ipBlocked = (byIp[0]?.value ?? 0) >= MAX_IP_FAILURES;
  const delaySeconds = failures >= MAX_IDENTIFIER_FAILURES
    ? Math.min(900, 30 * 2 ** Math.min(failures - MAX_IDENTIFIER_FAILURES, 5))
    : 0;
  const lastAttempt = byIdentifier[0]?.lastAttempt?.getTime() ?? 0;
  const remainingSeconds = Math.max(0, Math.ceil((lastAttempt + delaySeconds * 1000 - Date.now()) / 1000));
  const blocked = ipBlocked || remainingSeconds > 0;
  return { blocked, retryAfterSeconds: ipBlocked ? 900 : remainingSeconds };
}

export async function recordLoginAttempt(keys: Awaited<ReturnType<typeof loginKeys>>, success: boolean) {
  if (success) {
    await db.delete(loginAttempts).where(and(eq(loginAttempts.identifierHash, keys.identifierHash), eq(loginAttempts.success, false)));
  }
  await db.insert(loginAttempts).values({ ...keys, success });
}
