import { NextResponse } from "next/server";
import { saveAnswer } from "@/lib/kv";

export async function POST(request: Request) {
  try {
    const { examId, questionId, answer } = await request.json();

    if (!examId || !questionId) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 });
    }

    await saveAnswer(examId, questionId, answer || "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
