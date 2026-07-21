import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "./db/schema";

export const SESSION_COOKIE = "trainner_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

function readSecret(name: "AUTH_SECRET" | "AUTH_SECRET_PREVIOUS"): Uint8Array | null {
  const value = process.env[name];
  if (!value) return null;
  if (value.length < 32) throw new Error(`${name} must be at least 32 characters`);
  return new TextEncoder().encode(value);
}

const currentSecret = readSecret("AUTH_SECRET");
if (!currentSecret && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET is required in production and must be at least 32 characters");
}
const secret = currentSecret ?? new TextEncoder().encode("development-only-secret-change-me-now");
const previousSecret = readSecret("AUTH_SECRET_PREVIOUS");

export interface SessionPayload extends JWTPayload {
  uid: number;
  role: Role;
  username: string;
  name: string;
  sv: number;
}

export async function signSession(
  data: Pick<SessionPayload, "uid" | "role" | "username" | "name" | "sv">,
): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(
  token?: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as SessionPayload;
    } catch (error) {
      if (!previousSecret) throw error;
      const { payload } = await jwtVerify(token, previousSecret);
      return payload as SessionPayload;
    }
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE;

/** ปลายทางหน้าแรกของแต่ละ role */
export function homeFor(role: Role): string {
  if (role === "OWNER") return "/owner";
  if (role === "TRAINER") return "/trainer";
  return "/client";
}
