import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_token";
const COOKIE_MAX_AGE = 86400; // 24 hours

function getSecret(): string {
  // Derive signing secret from ADMIN_PASSWORD (required).
  // If ADMIN_PASSWORD is empty, verification will fail by design.
  return process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyPassword(password: string): boolean {
  const adminPassword = getSecret();
  if (!adminPassword) return false;
  return safeEqual(password, adminPassword);
}

export async function setAdminCookie(): Promise<string> {
  const issuedAt = Date.now();
  const payload = `admin:${issuedAt}`;
  const signature = sign(payload);
  const token = `${payload}.${signature}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return token;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  // Must start with "admin:" and a parseable timestamp.
  if (!payload.startsWith("admin:")) return false;
  const issuedAt = Number(payload.slice(6));
  if (!Number.isFinite(issuedAt)) return false;
  // Expire after COOKIE_MAX_AGE seconds
  if (Date.now() - issuedAt > COOKIE_MAX_AGE * 1000) return false;
  // Verify signature
  const expected = sign(payload);
  return safeEqual(signature, expected);
}

/**
 * Verify a raw cookie header string (used by route handlers that don't
 * have access to next/headers).
 */
export function isAdminTokenValid(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return verifyToken(match?.[1]);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}
