import { NextResponse } from "next/server";
import { verifyPassword, setAdminCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    await setAdminCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 400 });
  }
}
