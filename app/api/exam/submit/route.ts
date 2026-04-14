import { NextResponse } from "next/server";
import { submitExam } from "@/lib/kv";
import { gradeExam } from "@/lib/grading";

export async function POST(request: Request) {
  try {
    const { examId } = await request.json();

    if (!examId) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 });
    }

    const exam = await submitExam(examId);

    // Grade asynchronously - don't block the response
    gradeExam(exam).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
