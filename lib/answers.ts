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
  { questionId: "tf4", correctAnswer: "false" },
  { questionId: "tf5", correctAnswer: "true" },
  { questionId: "tf6", correctAnswer: "true" },
  { questionId: "tf7", correctAnswer: "true" },
  { questionId: "tf8", correctAnswer: "true" },
  { questionId: "tf9", correctAnswer: "true" },
  { questionId: "tf10", correctAnswer: "false" },

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

  // === 场景分析题 ===
  {
    questionId: "sc1a",
    rubric: `评分标准（满分 3 分）：
至少列出 3 个测试场景（每个 1 分）：
- 正常返回研报列表（JSON 文件有数据）
- 空数据场景（JSON 文件为空列表）
- 异常场景（JSON 文件解析失败/文件不存在）
其他合理场景也可得分，如：大数据量、特殊字符、并发请求等`,
  },
  {
    questionId: "sc1b",
    rubric: `评分标准（满分 4 分）：
- 正确使用 mocker.patch 模拟 load_json 返回空列表（2 分）
- 调用被测函数 get_reports() 并断言返回结果为空列表（1 分）
- 代码思路清晰、说明合理（1 分）

参考代码：
def test_empty_case(self, mocker):
    mocker.patch('app.load_json', return_value=[])
    result = get_reports()
    assert result == []`,
  },
  {
    questionId: "sc1c",
    rubric: `评分标准（满分 5 分）：
处理方式（3 分）：
- 立即为该 P0 用户故事补充测试用例，这是阻塞性问题
- 回溯检查是否有其他高优先级 US 也缺少 TC

Trace 追踪矩阵的价值（2 分）：
- 确保每个需求都有对应的测试覆盖
- P0 级需求缺少 TC 意味着质量闭环存在断裂
- Test 阶段的每个 TC 必须映射到 US，反过来每个重要 US 也必须有 TC 覆盖`,
  },
  {
    questionId: "sc2a",
    rubric: `评分标准（满分 3 分）：
至少设计 3 个 Agent 角色（每个 1 分）：
- 数据采集 Agent：负责从多个来源（新闻网站、社交媒体、公告平台）定时抓取舆情数据
- 内容分析 Agent：对采集到的原始数据进行情感分析、关键词提取、主题分类
- 报告生成 Agent：将分析结果汇总为结构化的舆情报告，包含风险提示和趋势判断
其他合理角色也可得分`,
  },
  {
    questionId: "sc2b",
    rubric: `评分标准（满分 5 分）：
协作流程完整性（3 分）：
- 数据采集 Agent（定时触发）→ 数据标准化处理 → 内容分析 Agent（接收标准化数据）→ 分析结果 → 报告生成 Agent（汇总分析结果）→ 输出舆情报告

关键节点说明（2 分）：
- 消息传递的顺序和触发条件
- 数据格式转换节点
- 最终输出方式（如通过 CoPaw 推送到钉钉群）`,
  },
  {
    questionId: "sc2c",
    rubric: `评分标准（满分 4 分）：
结合 GlueCoding "来源→用途→留存→合规"思路（每个维度 1 分）：
- 来源：JSON 来源直接解析；HTML 来源通过解析器提取结构化字段
- 用途：统一转换为标准中间格式（如统一的 JSON schema），供分析 Agent 使用
- 留存：标准化后的数据存储为统一格式，原始数据保留备查
- 合规：记录数据来源出处，确保引用可追溯，敏感内容过滤`,
  },
];
