import Redis from "ioredis";
import { nanoid } from "nanoid";
import { ExamRecord, Grading } from "./types";

// Singleton Redis client - reuse across requests
declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

function getRedis(): Redis {
  if (!global.__redis) {
    global.__redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }
  return global.__redis;
}

const redis = getRedis();

const EXAM_PREFIX = "exam:";
const INDEX_KEY = "exam:index";

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  await redis.set(key, JSON.stringify(value));
}

export async function createExam(name: string): Promise<ExamRecord> {
  // Check for duplicate name
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

  await setJSON(`${EXAM_PREFIX}${id}`, record);

  // Add to index
  const index = (await getJSON<string[]>(INDEX_KEY)) || [];
  index.push(id);
  await setJSON(INDEX_KEY, index);

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
  await setJSON(`${EXAM_PREFIX}${id}`, exam);
}

export async function submitExam(id: string): Promise<ExamRecord> {
  const exam = await getExam(id);
  if (!exam) throw new Error("考试不存在");
  if (exam.submittedAt) throw new Error("考试已提交");

  exam.submittedAt = Date.now();
  exam.grading.status = "grading";
  await setJSON(`${EXAM_PREFIX}${id}`, exam);
  return exam;
}

export async function updateGrading(
  id: string,
  grading: Grading
): Promise<void> {
  const exam = await getExam(id);
  if (!exam) throw new Error("考试不存在");

  exam.grading = grading;
  await setJSON(`${EXAM_PREFIX}${id}`, exam);
}

export async function listExams(): Promise<ExamRecord[]> {
  const index = (await getJSON<string[]>(INDEX_KEY)) || [];
  const exams = await Promise.all(index.map((id) => getExam(id)));
  return exams.filter((e): e is ExamRecord => e !== null);
}

export async function clearAllExams(): Promise<number> {
  const index = (await getJSON<string[]>(INDEX_KEY)) || [];
  if (index.length === 0) return 0;

  // Delete all exam records
  await Promise.all(
    index.map((id) => redis.del(`${EXAM_PREFIX}${id}`))
  );

  // Clear the index
  await redis.del(INDEX_KEY);

  return index.length;
}
