import { Answer } from "./types";

export const answers: Answer[] = [
  // === 选择题 ===
  { questionId: "c1", correctAnswer: "B" },
  { questionId: "c2", correctAnswer: "B" },
  { questionId: "c3", correctAnswer: "C" },
  { questionId: "c4", correctAnswer: "B" },
  { questionId: "c5", correctAnswer: "B" },
  { questionId: "c6", correctAnswer: "B" },
  { questionId: "c7", correctAnswer: "B" },
  { questionId: "c8", correctAnswer: "D" },
  { questionId: "c9", correctAnswer: "B" },
  { questionId: "c10", correctAnswer: "B" },
  { questionId: "c11", correctAnswer: "B" },
  { questionId: "c12", correctAnswer: "B" },
  { questionId: "c13", correctAnswer: "B" },

  // === 多选题（用逗号分隔的字母序列，如 "A,C,D"，要求按字母顺序） ===
  { questionId: "m1", correctAnswer: "A,C,D" },
  { questionId: "m2", correctAnswer: "A,B,C,E" },
  { questionId: "m3", correctAnswer: "A,B,C,E" },
  { questionId: "m4", correctAnswer: "A,B,C,E" },
  { questionId: "m5", correctAnswer: "A,B,C,E" },

  // === 判断题 ===
  { questionId: "tf1", correctAnswer: "true" },
  { questionId: "tf2", correctAnswer: "false" },
  { questionId: "tf3", correctAnswer: "true" },
  { questionId: "tf4", correctAnswer: "true" },
  { questionId: "tf5", correctAnswer: "true" },
  { questionId: "tf6", correctAnswer: "true" },
  { questionId: "tf7", correctAnswer: "true" },
  { questionId: "tf8", correctAnswer: "true" },
  { questionId: "tf9", correctAnswer: "true" },
  { questionId: "tf10", correctAnswer: "true" },

  // === 简答题 ===
  {
    questionId: "sa1",
    rubric: `评分标准（满分 5 分）：5 种模式各 1 分（场景 0.5 分 + 原因 0.5 分）。

参考要点：

- 智能体模式（Agent Mode）：适用于完整的端到端开发任务，如新功能开发、bug 修复、自动化重构等。原因：AI 可自主决策、调用工具、执行命令，适合需要多步骤连续操作的复杂任务。

- 专家团模式（Expert Team）：适用于需要多视角的复杂决策，如方案评审、架构设计、技术选型。原因：多个专业 Agent 扮演不同角色（如架构师、前端、后端、安全等），从不同维度给出建议，避免单一视角的盲点。

- 智能问答（Smart Q&A / Ask）：适用于学习、理解代码、技术咨询、概念查询。原因：单轮或多轮对话只回答问题不主动修改代码，适合需要"解释"而非"动手"的场景。

- /plan 模式：适用于先思考再动手的任务，如新功能开发、重构前规划、需求拆解。原因：先制定方案再执行，避免直接生成代码导致返工，适合需求复杂或方案不明确的情况。

- Quest 模式：适用于探索性任务，如对比分析（需求 vs 现有项目）、问题诊断、技术调研。原因：AI 主动探索、试错，适合不确定结果、需要快速验证假设的场景。

合理表述其他正确含义也可得分。`,
  },
  {
    questionId: "sa2",
    rubric: `评分标准（满分 5 分）：
六阶段核心问题（共 2 分，每个约 0.3 分）：
- Proposal：做不做？边界在哪？
- Spec：做成什么样？行为契约是什么？
- Design：怎么做？技术选什么？
- Tasks：谁做？什么时候完？
- Test：怎么验？门禁是什么？
- Trace：闭环了吗？变更可控吗？

三层简约视角分组（共 3 分，每层 1 分）：
- 决策层（Proposal → Spec）：做不做？做成什么样？
- 执行层（Design → Tasks）：怎么做？谁来做？
- 验证层（Test → Trace）：做对了吗？可追溯吗？`,
  },

  // 场景分析题 sc1 的评分标准已移除 — 该题因网络问题大面积丢失答案，
  // 整题不再计入总分。历史答题数据保留在 Redis 中但不参与 grading。
];
