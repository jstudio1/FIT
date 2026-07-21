import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { privacyConsents } from "./db/schema";

export const CURRENT_PRIVACY_POLICY_VERSION = "2026-07-21";

export async function hasCurrentPrivacyConsent(userId: number): Promise<boolean> {
  const [consent] = await db.select({ userId: privacyConsents.userId }).from(privacyConsents).where(and(
    eq(privacyConsents.userId, userId),
    eq(privacyConsents.policyVersion, CURRENT_PRIVACY_POLICY_VERSION),
    isNull(privacyConsents.withdrawnAt),
  )).limit(1);
  return Boolean(consent);
}
