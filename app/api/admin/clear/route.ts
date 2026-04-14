import { NextResponse } from "next/server";
import { clearAllExams } from "@/lib/kv";

export async function POST(request: Request) {
  // Check admin auth via cookie
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("admin_token=")) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const count = await clearAllExams();
    return NextResponse.json({ ok: true, deleted: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "清空失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
