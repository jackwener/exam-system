import type { ExamRecord, QuestionScore, GradingBreakdown } from "./types";

// ============================================================
// Seed 演示数据 · 让管理员后台一启动就有 3 份答卷可看
//   - 张高分：92 分（演示及格 + 高分场景）
//   - 李及格：68 分（演示及格边界 + 部分题失败的情况）
//   - 王挂科：42 分（演示不及格 + 缺答场景，可用来试 fill-missing 功能）
//
// 注意：seed 出的 record 的 grading.status = "completed"
// 跳过真实评分流程；id 用固定前缀 "seed_xxx" 以便区分
// ============================================================

const SEED_RECORDS: ExamRecord[] = [
  {
    id: "seed_zhang_gaofen",
    name: "张高分",
    startedAt: Date.now() - 60 * 60 * 1000, // 1h ago
    submittedAt: Date.now() - 35 * 60 * 1000, // 25 min taken
    answers: {
      // 选择题：全对
      c1: "B", c2: "B", c3: "C", c4: "B", c5: "B", c6: "B",
      c7: "B", c8: "D", c9: "B", c10: "B", c11: "B", c12: "B", c13: "B",
      // 多选题：4 对 1 漏选
      m1: "A,C,D", m2: "A,B,C,E", m3: "A,B,C,E", m4: "A,B,C,E", m5: "A,B,C",
      // 判断题：全对
      tf1: "true", tf2: "false", tf3: "true", tf4: "true", tf5: "true",
      tf6: "true", tf7: "true", tf8: "true", tf9: "true", tf10: "true",
      // 简答：写得不错
      sa1: "智能体模式适合完整开发任务；专家团模式适合需要多视角的方案评审；智能问答适合学习理解；/plan 模式适合复杂任务的预先规划；Quest 模式适合带具体目标的连贯探索。",
      sa2: "Spec Coding 六阶段：明意、立约、构架、立稿、织码、复核。三层视角：意图层（明意+立约）、设计层（构架+立稿）、实现层（织码+复核）。",
    },
    grading: makeGrading({
      total: 92,
      choice: 39,
      multiChoice: 18,
      trueFalse: 20,
      shortAnswer: 15,
      saFeedback: {
        sa1: "✅ 五种模式都覆盖到，原因解释清晰，得 5/5",
        sa2: "✅ 六阶段列全，分组准确，得 10/11（个别阶段的核心问题未点透）",
      },
    }),
  },
  {
    id: "seed_li_jige",
    name: "李及格",
    startedAt: Date.now() - 90 * 60 * 1000,
    submittedAt: Date.now() - 70 * 60 * 1000,
    answers: {
      // 选择题：错 3 道
      c1: "B", c2: "C", c3: "C", c4: "B", c5: "A", c6: "B",
      c7: "B", c8: "D", c9: "B", c10: "B", c11: "D", c12: "B", c13: "B",
      // 多选题：2 对 2 漏 1 错
      m1: "A,C,D", m2: "A,B,C", m3: "A,B,C,E", m4: "A,B,D", m5: "A,B,C,E",
      // 判断题：错 2 道
      tf1: "true", tf2: "true", tf3: "true", tf4: "false", tf5: "true",
      tf6: "true", tf7: "true", tf8: "true", tf9: "true", tf10: "true",
      // 简答：一般
      sa1: "智能体模式做开发；专家团模式多个角色一起评审；智能问答就是问问题；其他两个不太熟。",
      sa2: "Spec Coding 是先写规格再写代码，分几个阶段层层推进。",
    },
    grading: makeGrading({
      total: 68,
      choice: 30,
      multiChoice: 14,
      trueFalse: 16,
      shortAnswer: 8,
      saFeedback: {
        sa1: "⚠️ 只覆盖了 3 种模式，且原因解释不到位，得 2/5",
        sa2: "⚠️ 没有列出六阶段具体名称，分层视角缺失，得 6/11",
      },
    }),
  },
  {
    id: "seed_wang_guake",
    name: "王挂科",
    startedAt: Date.now() - 40 * 60 * 1000,
    submittedAt: Date.now() - 22 * 60 * 1000,
    answers: {
      // 选择题：对 7 道
      c1: "A", c2: "B", c3: "A", c4: "B", c5: "A", c6: "B",
      c7: "A", c8: "D", c9: "B", c10: "A", c11: "A", c12: "B", c13: "A",
      // 多选题：基本错
      m1: "A,B", m2: "A,B", m3: "A,B,C", m4: "A", m5: "A,B,C",
      // 判断题：对 6 道
      tf1: "true", tf2: "false", tf3: "false", tf4: "true", tf5: "false",
      tf6: "true", tf7: "true", tf8: "false", tf9: "true", tf10: "true",
      // 简答：缺答 sa2
      sa1: "智能体模式就是 AI 自己做事。其他不知道。",
      // sa2 缺答（演示 fill-missing 功能的素材）
    },
    grading: makeGrading({
      total: 42,
      choice: 21,
      multiChoice: 6,
      trueFalse: 12,
      shortAnswer: 3,
      saFeedback: {
        sa1: "❌ 只答了 1 种模式且解释过于简单，得 1/5",
        sa2: "❌ 未作答，得 0/11",
      },
    }),
  },
];

// ============================================================
// 辅助：构造完成态的 Grading 结构
// ============================================================

interface MakeGradingOpts {
  total: number;
  choice: number;
  multiChoice: number;
  trueFalse: number;
  shortAnswer: number;
  saFeedback?: Record<string, string>;
}

function makeGrading(opts: MakeGradingOpts) {
  const breakdown: GradingBreakdown = {
    choice: { score: opts.choice, max: 39 },
    multiChoice: { score: opts.multiChoice, max: 20 },
    trueFalse: { score: opts.trueFalse, max: 20 },
    shortAnswer: { score: opts.shortAnswer, max: 21 },
  };
  // 简答题分数粗略分到 sa1 / sa2 上，仅供后台展示用
  const scores: Record<string, QuestionScore> = {};
  if (opts.saFeedback) {
    const half = Math.round(opts.shortAnswer / 2);
    if (opts.saFeedback.sa1) {
      scores.sa1 = { score: Math.min(half, 5), maxScore: 5, feedback: opts.saFeedback.sa1 };
    }
    if (opts.saFeedback.sa2) {
      scores.sa2 = { score: opts.shortAnswer - Math.min(half, 5), maxScore: 16, feedback: opts.saFeedback.sa2 };
    }
  }
  return {
    status: "completed" as const,
    scores,
    totalScore: opts.total,
    breakdown,
  };
}

// ============================================================
// Entrypoint · 由 lib/kv.ts 在首次访问时调用一次
// ============================================================

export function seedExamData(store: Map<string, string>): void {
  // 已经有数据就不重复 seed（防止 HMR 热重载误清空）
  const existingIndex = store.get("exam:index");
  if (existingIndex) {
    const parsed = JSON.parse(existingIndex) as string[];
    if (parsed.length > 0) return;
  }

  const index: string[] = [];
  for (const rec of SEED_RECORDS) {
    store.set(`exam:${rec.id}`, JSON.stringify(rec));
    index.push(rec.id);
  }
  store.set("exam:index", JSON.stringify(index));

  console.log(`[seed] populated ${SEED_RECORDS.length} demo exam records`);
}
