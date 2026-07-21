"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { privacyConsents, privacyRequests, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { CURRENT_PRIVACY_POLICY_VERSION } from "@/lib/privacy";

export const PRIVACY_POLICY_VERSION = CURRENT_PRIVACY_POLICY_VERSION;

export async function acceptPrivacyAction(): Promise<void> {
  const user = await requireUser();
  await db.insert(privacyConsents).values({ userId: user.id, policyVersion: PRIVACY_POLICY_VERSION })
    .onDuplicateKeyUpdate({ set: { policyVersion: PRIVACY_POLICY_VERSION, acceptedAt: new Date(), withdrawnAt: null } });
  await writeAudit({ actorId: user.id, action: "PRIVACY_CONSENT_ACCEPTED", resourceType: "PRIVACY_CONSENT", subjectUserId: user.id, metadata: { policyVersion: PRIVACY_POLICY_VERSION } });
  revalidatePath("/client/privacy");
}

export async function requestAccountDeletionAction(): Promise<void> {
  const user = await requireUser();
  await db.transaction(async (tx) => {
    await tx.insert(privacyRequests).values({ userId: user.id, requestType: "DELETE" });
    await tx.update(users).set({ sessionVersion: user.sessionVersion + 1 }).where(eq(users.id, user.id));
  });
  await writeAudit({ actorId: user.id, action: "ACCOUNT_DELETION_REQUESTED", resourceType: "PRIVACY_REQUEST", subjectUserId: user.id });
  revalidatePath("/client/privacy");
}
