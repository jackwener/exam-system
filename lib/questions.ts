import type { Question, QuestionType, QuestionOption, SubQuestion } from "./types";

const SECTIONS = {
  choice: "一、选择题（每题 3 分，共 39 分）",
  trueFalse: "二、判断题（每题 2 分，共 20 分）",
  shortAnswer: "三、简答题（每题 8 分，共 16 分）",
  scenario: "四、场景分析题（共 25 分）",
} as const;

const SECTION_SHORT = {
  choice: "选择题",
  trueFalse: "判断题",
  shortAnswer: "简答题",
  scenario: "场景分析",
} as const;

function choiceQ(
  number: number,
  text: string,
  options: [string, string, string, string]
): Question {
  return {
    id: `c${number}`,
    type: "choice" as QuestionType,
    section: SECTIONS.choice,
    sectionShort: SECTION_SHORT.choice,
    number,
    text,
    options: options.map((t, i) => ({
      label: String.fromCharCode(65 + i),
      text: t,
    })) as QuestionOption[],
    maxScore: 3,
  };
}

function tfQ(number: number, text: string): Question {
  return {
    id: `tf${number}`,
    type: "trueFalse" as QuestionType,
    section: SECTIONS.trueFalse,
    sectionShort: SECTION_SHORT.trueFalse,
    number,
    text,
    options: [
      { label: "✓", text: "正确" },
      { label: "✗", text: "错误" },
    ],
    maxScore: 2,
  };
}

function saQ(number: number, text: string): Question {
  return {
    id: `sa${number}`,
    type: "shortAnswer" as QuestionType,
    section: SECTIONS.shortAnswer,
    sectionShort: SECTION_SHORT.shortAnswer,
    number,
    text,
    maxScore: 8,
  };
}

function scQ(
  number: number,
  text: string,
  maxScore: number,
  subs: SubQuestion[]
): Question {
  return {
    id: `sc${number}`,
    type: "scenario" as QuestionType,
    section: SECTIONS.scenario,
    sectionShort: SECTION_SHORT.scenario,
    number,
    text,
    subQuestions: subs,
    maxScore,
  };
}

export const questions: Question[] = [
  // ==================== 选择题 ====================
  choiceQ(1, "Spec Coding 六阶段的正确顺序是？", [
    "Proposal\u2192Design\u2192Spec\u2192Tasks\u2192Test\u2192Trace",
    "Proposal\u2192Spec\u2192Design\u2192Tasks\u2192Test\u2192Trace",
    "Spec\u2192Proposal\u2192Design\u2192Test\u2192Tasks\u2192Trace",
    "Proposal\u2192Spec\u2192Tasks\u2192Design\u2192Test\u2192Trace",
  ]),
  choiceQ(2, "在 Spec Coding 中，Spec 阶段的核心职责是什么？", [
    "定义系统架构和技术选型",
    `定义\u300c做成什么样\u300d的行为契约，回答 What/Why`,
    "拆解开发任务并分配给团队成员",
    "编写测试用例和验收标准",
  ]),
  choiceQ(3, `Spec Coding 的三层简约视角中，\u300c执行层\u300d包含哪些阶段？`, [
    "Proposal\u2192Spec",
    "Spec\u2192Design",
    "Design\u2192Tasks",
    "Test\u2192Trace",
  ]),
  choiceQ(4, "以下关于 Spec 和 Design 阶段的区分，正确的是？", [
    `Spec 回答\u300c怎么做\u300d，Design 回答\u300c做成什么样\u300d`,
    `Spec 回答\u300c做成什么样\u300d，Design 回答\u300c怎么做\u300d`,
    "Spec 和 Design 可以合并为一个阶段",
    "Design 阶段不涉及技术选型",
  ]),
  choiceQ(5, "Spec Coding 的 Trace（追踪矩阵）阶段的核心价值是什么？", [
    "追踪项目进度和里程碑",
    "确保需求\u2192用户故事\u2192API\u2192测试用例的闭环可追溯",
    "记录团队成员的工作量",
    "跟踪线上 Bug 的修复进度",
  ]),
  choiceQ(6, `Workshop Day 2 \u300cSpec 打印工作流\u300d的核心理念是什么？`, [
    "上午编码\u2192中午打印代码\u2192下午代码审查",
    "上午写 Spec\u2192中午打印锁定\u2192下午基于纸质 Spec 编码",
    "上午写测试\u2192中午运行测试\u2192下午修复 Bug",
    "上午需求分析\u2192中午方案设计\u2192下午编码实现",
  ]),
  choiceQ(7, "在 Qoder 中，以下哪个操作模式用于让 AI 对比需求文档与现有项目结构？", [
    "/plan + 记忆模式",
    "/plan + Quest 模式",
    "/plan + 反思模式",
    "/plan + 模板模式",
  ]),
  choiceQ(8, "在 Workshop 实验中，项目扫描（RepoWiki）的主要产出物不包括以下哪项？", [
    "项目概览报告",
    "API 清单",
    "技术债务报告",
    "自动生成的测试用例",
  ]),
  choiceQ(9, "关于 MCP（Model Context Protocol）集成网关，以下说法正确的是？", [
    "MCP 是一种数据库协议",
    "MCP 标准化了 AI 与外部系统的交互，解耦业务逻辑和工具调用",
    "MCP 只能用于 HTTP 接口调用",
    "MCP 是阿里云独有的协议",
  ]),
  choiceQ(10, "在 Workshop 的测试环节中，使用 pytest 的 mocker.patch 的目的是什么？", [
    "修改生产环境的数据",
    "模拟外部依赖的返回值，实现单元测试隔离",
    "自动生成测试报告",
    "加速测试运行速度",
  ]),
  choiceQ(11, "GlueCoding 的核心概念是什么？", [
    "一种前端 CSS 框架",
    `数据管道编排，通过\u300c来源\u2192用途\u2192留存\u2192合规\u300d四列简表设计数据流`,
    "一种代码合并工具",
    "一种 API 网关协议",
  ]),
  choiceQ(12, "在 IRA 项目中，企业研发规范要求 PR 描述必须包含哪些内容？", [
    "只需要代码变更说明",
    "关联 Spec 文档路径、自测说明、截图或 curl 示例",
    "只需要截图",
    "只需要关联的 JIRA 工单号",
  ]),
  choiceQ(13, "在 Workshop 中配置 CoPaw SKILL 后，钉钉机器人能收到用户消息但回复内容与预期完全不符，最应该优先排查的是？", [
    "钉钉服务器网络延迟",
    "SKILL 中的 Prompt 指令和关联的工具（MCP）配置",
    "JSON 数据文件格式错误",
    "React 前端组件渲染异常",
  ]),

  // ==================== 判断题 ====================
  tfQ(1, "Proposal 阶段的核心职责是做可行性判断和范围框定，不展开功能细节和技术方案。"),
  tfQ(2, `在 Spec Coding 中，Design 阶段回答的核心问题是\u300c做成什么样？行为契约是什么？\u300d`),
  tfQ(3, "Qoder 的反思模式用于让 AI 完成任务后进行自我验证和修正，人类再审核确认。"),
  tfQ(4, "在 IRA 项目中，Demo 环境和生产环境的数据存储方式完全相同。"),
  tfQ(5, "MCP 集成网关的核心价值是提供稳定可靠的工具集成，接口统一可替换。"),
  tfQ(6, "pytest 中 mocker.patch 可以用于模拟 JSON 解析异常等边界场景的测试。"),
  tfQ(7, "Workshop 的冻结点建议中，Day 2 结束时应冻结接口命名与路径前缀。"),
  tfQ(8, "在 Spec Coding 的 Tasks 阶段，每个 Task 必须可追溯到对应的用户故事（US）。"),
  tfQ(9, "Qoder 中的 Quest 模式适用于探索性的问题诊断和技术调研。"),
  tfQ(10, "CoPaw 的一个 SKILL 只能绑定一个固定的 MCP 工具，如果 Agent 需要同时查询股票行情和研报数据，必须创建两个独立的 SKILL 分别处理。"),

  // ==================== 简答题 ====================
  saQ(1, "请简要描述 Spec Coding 六阶段各自回答的核心问题，以及三层简约视角如何将六个阶段分组。"),
  saQ(2, "请描述 IRA 项目的目标用户群体（至少两类）和核心功能范围（Must 级别），并解释为什么选择 Flask + React(Vite) + JSON 文件存储这一技术栈。"),

  // ==================== 场景分析题 ====================
  scQ(
    1,
    "测试与质量保障 - 你负责 IRA 项目的研报列表接口测试，该接口从 JSON 文件读取数据并返回研报列表。请回答以下问题：",
    13,
    [
      { id: "sc1a", text: "(a) 请列出该接口至少需要覆盖的 3 个测试场景（正常和异常）。（3分）", maxScore: 3 },
      { id: "sc1b", text: `(b) 针对\u300cJSON 文件为空\u300d的场景，请写出使用 pytest + mocker 的测试代码思路（伪代码即可），说明如何用 mocker.patch 模拟这个场景。（5分）`, maxScore: 5 },
      { id: "sc1c", text: "(c) 如果发现某条 P0 级用户故事（US）在 Test 阶段没有对应的测试用例（TC），你应该如何处理？这反映了 Trace 追踪矩阵的什么价值？（5分）", maxScore: 5 },
    ]
  ),
  scQ(
    2,
    "多 Agent 系统设计 - 你需要为 IRA 项目设计一个舆情监控的多 Agent 系统，包含数据采集、内容分析、报告生成三个环节。请回答以下问题：",
    12,
    [
      { id: "sc2a", text: "(a) 请设计至少 3 个 Agent 角色，说明每个 Agent 的职责。（3分）", maxScore: 3 },
      { id: "sc2b", text: "(b) 画出这些 Agent 之间的协作流程（文字描述即可），说明消息传递的顺序和关键节点。（5分）", maxScore: 5 },
      { id: "sc2c", text: `(c) 如果数据采集 Agent 获取到的数据格式不一致（部分为 JSON、部分为 HTML），你会如何在 Agent 协作流程中处理这个问题？请结合 GlueCoding 的\u300c来源\u2192用途\u2192留存\u2192合规\u300d思路回答。（4分）`, maxScore: 4 },
    ]
  ),
];

export const EXAM_CONFIG = {
  title: "AI Coding Workshop 结业考试",
  duration: 1200,
  totalQuestions: 27,
  totalScore: 100,
} as const;
