import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_token";
const COOKIE_MAX_AGE = 86400; // 24 hours

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    // Workshop default · 与 lib/auth.ts 的 DEFAULT_ADMIN_PASSWORD 对齐
    const adminPassword = process.env.ADMIN_PASSWORD || "workshop2026";

    if (typeof password !== "string") {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }
    if (!safeEqual(password, adminPassword)) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    // Issue signed token: "admin:<timestamp>.<HMAC-SHA256>"
    const payload = `admin:${Date.now()}`;
    const signature = createHmac("sha256", adminPassword)
      .update(payload)
      .digest("hex");
    const token = `${payload}.${signature}`;

    // Only mark cookie as Secure when the request is actually over HTTPS.
    // Otherwise browsers silently drop the cookie on plain-http deployments
    // (e.g. self-hosted on an IP without TLS), causing login to appear to
    // "succeed" but the next page immediately bounces back to /admin/login.
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const urlProto = new URL(request.url).protocol.replace(":", "");
    const isHttps = (forwardedProto || urlProto) === "https";

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 400 });
  }
}
