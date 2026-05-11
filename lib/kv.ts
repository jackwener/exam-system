import { nanoid } from "nanoid";
import { ExamRecord, Grading } from "./types";
import { seedExamData } from "./seed";

// ============================================================
// 内存存储 · workshop 版
//   原 main 分支用 ioredis 做存储。workshop 不需要持久化，也不想让
//   学员装 Redis，所以用 globalThis Map 做单例。
//   - Next.js dev 的 HMR 热重载不会清空（靠 globalThis 保留）
//   - 进程重启会清空 — 这对 workshop 反而是好事，每个学员一手干净状态
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var __examStore: Map<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __examSeeded: boolean | undefined;
}

const store = (global.__examStore ??= new Map<string, string>());

const EXAM_PREFIX = "exam:";
const INDEX_KEY = "exam:index";

function getJSON<T>(key: string): T | null {
  const raw = store.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setJSON(key: string, value: unknown): void {
  store.set(key, JSON.stringify(value));
}

function delKey(key: string): void {
  store.delete(key);
}

// ============================================================
// 公共 API · 保持 async 签名以与 API routes 既有调用方式兼容
// ============================================================

export async function createExam(name: string): Promise<ExamRecord> {
  // 重名校验：已提交的同名记录拒绝再开考
  const existing = await listExams();
  const duplicate = existing.find(
    (e) => e.name === name && e.submittedAt !== null
  );
  if (duplicate) {
    throw new Error(`姓名 "${name}" 已经参加过考试`);
  }

  const id = nanoid(10);
  const record: ExamRecord = {
    id,
    name,
    startedAt: Date.now(),
    submittedAt: null,
    answers: {},
    grading: {
      status: "pending",
      scores: {},
      totalScore: 0,
      breakdown: {
        choice: { score: 0, max: 39 },
        multiChoice: { score: 0, max: 20 },
        trueFalse: { score: 0, max: 20 },
        shortAnswer: { score: 0, max: 21 },
      },
    },
  };

  setJSON(`${EXAM_PREFIX}${id}`, record);

  const index = getJSON<string[]>(INDEX_KEY) || [];
  index.push(id);
  setJSON(INDEX_KEY, index);

  return record;
}

export async function getExam(id: string): Promise<ExamRecord | null> {
  return getJSON<ExamRecord>(`${EXAM_PREFIX}${id}`);
}

export async function saveAnswer(
  id: string,
  questionId: string,
  answer: string
): Promise<void> {
  const exam = await getExam(id);
  if (!exam) throw new Error("考试不存在");
  if (exam.submittedAt) throw new Error("考试已提交，无法修改");

  exam.answers[questionId] = answer;
  setJSON(`${EXAM_PREFIX}${id}`, exam);
}

export async function submitExam(id: string): Promise<ExamRecord> {
  const exam = await getExam(id);
  if (!exam) throw new Error("考试不存在");
  if (exam.submittedAt) throw new Error("考试已提交");

  exam.submittedAt = Date.now();
  exam.grading.status = "grading";
  setJSON(`${EXAM_PREFIX}${id}`, exam);
  return exam;
}

export async function updateGrading(
  id: string,
  grading: Grading
): Promise<void> {
  const exam = await getExam(id);
  if (!exam) throw new Error("考试不存在");

  exam.grading = grading;
  setJSON(`${EXAM_PREFIX}${id}`, exam);
}

export async function listExams(): Promise<ExamRecord[]> {
  const index = getJSON<string[]>(INDEX_KEY) || [];
  const exams = index.map((id) => getJSON<ExamRecord>(`${EXAM_PREFIX}${id}`));
  return exams.filter((e): e is ExamRecord => e !== null);
}

export async function clearAllExams(): Promise<number> {
  const index = getJSON<string[]>(INDEX_KEY) || [];
  if (index.length === 0) return 0;

  index.forEach((id) => delKey(`${EXAM_PREFIX}${id}`));
  delKey(INDEX_KEY);

  return index.length;
}

// ============================================================
// 启动时 seed 一次 · 让管理员后台一上来就有数据可看
//   同步调用：保证后续 listExams() 能立刻读到 seed 数据
// ============================================================

if (!global.__examSeeded) {
  global.__examSeeded = true;
  try {
    seedExamData(store);
  } catch (e) {
    console.error("[kv] seed failed:", e);
  }
}
