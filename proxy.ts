import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminTokenValid } from "@/lib/auth";

const COOKIE_NAME = "admin_token";

// Paths that must be reachable without an admin cookie:
// - /admin/login (the page itself)
// - /api/admin/auth (login endpoint)
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth =
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
    !PUBLIC_ADMIN_PATHS.some((p) => pathname === p);

  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = isAdminTokenValid(token ? `${COOKIE_NAME}=${token}` : undefined);

  if (!valid) {
    // For API routes, return 401 JSON instead of redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
