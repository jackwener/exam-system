import { NextResponse } from "next/server";
import { createExam } from "@/lib/kv";

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "请输入姓名" }, { status: 400 });
    }

    const exam = await createExam(name.trim());
    return NextResponse.json({ id: exam.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "创建考试失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
