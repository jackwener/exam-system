import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";
const COOKIE_MAX_AGE = 86400; // 24 hours

export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

export async function setAdminCookie(): Promise<void> {
  const token = Buffer.from(`admin:${Date.now()}`).toString("base64");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);
  return !!token?.value;
}
