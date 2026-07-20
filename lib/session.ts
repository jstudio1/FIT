import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "./db/schema";

export const SESSION_COOKIE = "trainner_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me",
);

export interface SessionPayload extends JWTPayload {
  uid: number;
  role: Role;
  username: string;
  name: string;
}

export async function signSession(
  data: Pick<SessionPayload, "uid" | "role" | "username" | "name">,
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
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
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
