import "server-only";

import crypto from "crypto";
import { headers } from "next/headers";
import { db } from "./db";
import { auditLogs } from "./db/schema";

function securityPepper(): string {
  const value = process.env.AUDIT_PEPPER ?? process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("AUDIT_PEPPER is required in production");
  return value ?? "development-audit-pepper";
}

export function privacyHash(value: string): string {
  return crypto.createHmac("sha256", securityPepper()).update(value).digest("hex");
}

export async function requestIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function writeAudit(input: {
  actorId?: number | null;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  subjectUserId?: number | null;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const ip = await requestIp();
  await db.insert(auditLogs).values({
    actorId: input.actorId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId == null ? null : String(input.resourceId),
    subjectUserId: input.subjectUserId ?? null,
    ipHash: privacyHash(ip),
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}
