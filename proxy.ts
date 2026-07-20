import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession, homeFor } from "@/lib/session";

const roleGuards: { prefix: string; roles: string[] }[] = [
  { prefix: "/owner", roles: ["OWNER"] },
  { prefix: "/trainer", roles: ["TRAINER"] },
  { prefix: "/client", roles: ["CLIENT"] },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  // หน้าแรก "/" — เด้งตามสถานะ
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(session ? homeFor(session.role) : "/login", req.url),
    );
  }

  // ล็อกอินแล้วเข้า /login → เด้งไปหน้าแรกของ role
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }

  // ป้องกันหน้าตาม role
  const guard = roleGuards.find(
    (g) => pathname === g.prefix || pathname.startsWith(g.prefix + "/"),
  );
  if (guard) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!guard.roles.includes(session.role)) {
      return NextResponse.redirect(new URL(homeFor(session.role), req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/owner/:path*",
    "/trainer/:path*",
    "/client/:path*",
  ],
};
