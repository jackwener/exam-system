import { NextResponse } from "next/server";
import { clearAllExams } from "@/lib/kv";

// Auth is enforced by proxy.ts for /api/admin/:path* (except /api/admin/auth).
// This handler is guaranteed to run only after a valid admin token is present.

export async function POST() {
  try {
    const count = await clearAllExams();
    return NextResponse.json({ ok: true, deleted: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "清空失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
