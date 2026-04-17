import type { Question, QuestionType, QuestionOption, SubQuestion } from "./types";

const SECTIONS = {
  choice: "一、选择题（每题 3 分，共 39 分）",
  multiChoice: "二、多选题（每题 4 分，共 20 分）",
  trueFalse: "三、判断题（每题 2 分，共 20 分）",
  shortAnswer: "四、简答题（共 21 分）",
  scenario: "五、场景分析题（共 14 分）",
} as const;

const SECTION_SHORT = {
  choice: "选择题",
  multiChoice: "多选题",
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

function mcQ(
  number: number,
  text: string,
  options: string[]
): Question {
  return {
    id: `m${number}`,
    type: "multiChoice" as QuestionType,
    section: SECTIONS.multiChoice,
    sectionShort: SECTION_SHORT.multiChoice,
    number,
    text,
    options: options.map((t, i) => ({
      label: String.fromCharCode(65 + i),
      text: t,
    })) as QuestionOption[],
    maxScore: 4,
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
      { label: "\u2713", text: "正确" },
      { label: "\u2717", text: "错误" },
    ],
    maxScore: 2,
  };
}

function saQ(number: number, text: string, maxScore: number): Question {
  return {
    id: `sa${number}`,
    type: "shortAnswer" as QuestionType,
    section: SECTIONS.shortAnswer,
    sectionShort: SECTION_SHORT.shortAnswer,
    number,
    text,
    maxScore,
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
  // ==================== 选择题（13 道，每题 2 分） ====================
  choiceQ(1, "Spec Coding 六阶段的正确顺序是？", [
    "Proposal\u2192Design\u2192Spec\u2192Tasks\u2192Test\u2192Trace",
    "Proposal\u2192Spec\u2192Design\u2192Tasks\u2192Test\u2192Trace",
    "Spec\u2192Proposal\u2192Design\u2192Test\u2192Tasks\u2192Trace",
    "Proposal\u2192Spec\u2192Tasks\u2192Design\u2192Test\u2192Trace",
  ]),
  choiceQ(2, "在 Spec Coding 中，Spec 阶段的核心职责是什么？", [
    "定义系统架构分层和数据库 schema",
    `定义\u300c做成什么样\u300d的行为契约，回答 What/Why`,
    `定义\u300c怎么做\u300d的实现方案，回答 How`,
    "同时定义行为契约和技术实现，覆盖 What 和 How",
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
    "追溯变更影响范围，防止改一处破多处",
    "确保需求\u2192用户故事\u2192API\u2192测试用例的闭环可追溯",
    "记录每次代码变更的作者和时间",
    "收集线上 Bug 数据以驱动下一轮迭代",
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
    "MCP 封装了单个 LLM 厂商的 API 调用协议",
    "MCP 标准化 AI 与外部系统的交互，解耦业务逻辑和工具调用",
    "MCP 替代了 HTTP/gRPC，让所有工具调用走同一协议栈",
    "MCP 主要用于 Agent 之间的消息传递",
  ]),
  choiceQ(10, "在 Workshop 的测试环节中，使用 pytest 的 mocker.patch 的目的是什么？", [
    "替换真实数据库，让测试能直接写入生产库验证",
    "模拟外部依赖的返回值，实现单元测试隔离",
    "自动发现并运行所有符合命名规则的测试文件",
    "在测试失败时自动截图并生成 HTML 报告",
  ]),
  choiceQ(11, "GlueCoding 的核心概念是什么？", [
    "把多个独立函数粘合成一个大函数，减少调用层级",
    `数据管道编排，通过\u300c来源\u2192用途\u2192留存\u2192合规\u300d四列简表设计数据流`,
    "在不同模块之间补写胶水代码，填补接口差异",
    "用 AI 自动生成模块间的适配层代码",
  ]),
  choiceQ(12, "在 IRA 项目中，企业研发规范要求 PR 描述必须包含哪些内容？", [
    "代码变更说明 + 截图或 curl 示例",
    "关联 Spec 文档路径 + 自测说明 + 截图或 curl 示例",
    "关联 Spec 文档路径 + JIRA 工单号 + 自测说明",
    "自测说明 + 截图或 curl 示例 + 性能对比数据",
  ]),
  choiceQ(13, "在 Workshop 中配置 CoPaw SKILL 后，钉钉机器人能收到用户消息但回复内容与预期完全不符，最应该优先排查的是？", [
    "SKILL 关联的钉钉渠道 webhook 地址",
    "SKILL 中的 Prompt 指令和关联的 MCP 工具配置",
    "CoPaw 的账号登录状态是否过期",
    "本地 JSON 数据文件的字段是否完整",
  ]),

  // ==================== 多选题（5 道，每题 4 分） ====================
  mcQ(1, "你使用 Qoder 开发 IRA 新功能，以下哪些场景应该先启动 /plan 而不是直接写代码？（多选）", [
    `需求文档含糊，需要先对齐\u300c做成什么样\u300d`,
    "改一个已知的拼写错误",
    "涉及多个模块协作，不清楚改动范围",
    "要引入新的第三方库，需要评估选型",
    "修复一个 console.log 的输出格式",
  ]),
  mcQ(2, "在 Spec Coding 六阶段中，哪些情况下应该回到上一阶段而不是继续往下？（多选）", [
    "Design 阶段发现 Spec 的行为契约有歧义",
    "Tasks 阶段发现技术方案有性能问题",
    "Test 阶段发现某个 US 没有对应的 API",
    "写代码时发现变量命名风格和团队不符",
    "Trace 阶段发现某条需求无法追溯到测试",
  ]),
  mcQ(3, "对于 AI 生成的代码，以下哪些情况不能直接 merge，必须人工审核？（多选）", [
    "涉及用户数据库的写操作",
    "新增了外部 API 调用",
    "改动涉及金额、权限等敏感逻辑",
    "改了一个按钮的文案",
    "依赖的第三方库出现大版本变更",
  ]),
  mcQ(4, `你给 IRA 项目添加\u300c舆情监控\u300d功能，以下哪些是决定是否拆成多 Agent 的合理依据？（多选）`, [
    "不同环节需要调用不同的外部工具",
    "每个环节的输入输出格式不一样，需要独立处理",
    "某些环节需要定时触发，其他环节实时响应",
    "代码量超过 500 行",
    "不同环节的失败不应该互相影响",
  ]),
  mcQ(5, "用 AI 帮你改代码时，以下哪些做法是 Workshop 推荐的工作方式？（多选）", [
    `先在 Spec 里讲清楚\u300c改什么、为什么改\u300d，再让 AI 动手`,
    "让 AI 生成代码后，要求它先跑一遍自测",
    "关键改动要求 AI 画出变更影响范围，再让人工 Review",
    `直接说\u300c帮我优化这个函数\u300d，让 AI 自由发挥`,
    "让 AI 改完后，在 PR 描述里关联 Spec 路径、自测说明、截图",
  ]),

  // ==================== 判断题（10 道，每题 2 分） ====================
  tfQ(1, "Proposal 阶段的核心职责是做可行性判断和范围框定，不展开功能细节和技术方案。"),
  tfQ(2, `在 Spec Coding 中，Design 阶段回答的核心问题是\u300c做成什么样？行为契约是什么？\u300d`),
  tfQ(3, "Qoder 的反思模式用于让 AI 完成任务后进行自我验证和修正，人类再审核确认。"),
  tfQ(4, "在 IRA 投研问答 Spec Coding 项目中，数据存储方式也要在 Spec 文档中提前定义好。"),
  tfQ(5, "MCP 集成网关的核心价值是提供稳定可靠的工具集成，接口统一可替换。"),
  tfQ(6, "AI 生成代码即使看起来合理，涉及金额、权限等敏感逻辑时仍必须人工审核，不能直接合入主干。"),
  tfQ(7, "Workshop 的冻结点建议中，Day 2 结束时应冻结接口命名与路径前缀。"),
  tfQ(8, "在 Spec Coding 的 Tasks 阶段，每个 Task 必须可追溯到对应的用户故事（US）。"),
  tfQ(9, "Qoder 中的 Quest 模式适用于探索性的问题诊断和技术调研。"),
  tfQ(10, `Spec Coding 中，Design 阶段的产出物包括架构图、数据模型和技术选型，而\u300c行为契约\u300d属于 Spec 阶段的产出物。`),

  // ==================== 简答题（sa1=10, sa2=11，共 21 分） ====================
  saQ(
    1,
    `Qoder 的智能体模式、专家团模式、智能问答、/plan 模式、Quest 模式 这五种模式分别适用于什么样的场景？请说明原因。`,
    10
  ),
  saQ(
    2,
    "请简要描述 Spec Coding 六阶段各自回答的核心问题，以及三层简约视角如何将六个阶段分组。",
    11
  ),

  // ==================== 场景分析题（共 14 分） ====================
  scQ(
    1,
    "多 Agent 系统设计 - 你需要为 IRA 项目设计一个舆情监控的多 Agent 系统，包含数据采集、内容分析、报告生成三个环节。请回答以下问题：",
    14,
    [
      { id: "sc1a", text: "(a) 请设计至少 3 个 Agent 角色，说明每个 Agent 的职责。（4分）", maxScore: 4 },
      { id: "sc1b", text: "(b) 画出这些 Agent 之间的协作流程（文字描述即可），说明消息传递的顺序和关键节点。（5分）", maxScore: 5 },
      { id: "sc1c", text: `(c) 如果数据采集 Agent 获取到的数据格式不一致（部分为 JSON、部分为 HTML），你会如何在 Agent 协作流程中处理这个问题？请结合 GlueCoding 的\u300c来源\u2192用途\u2192留存\u2192合规\u300d思路回答。（5分）`, maxScore: 5 },
    ]
  ),
];

export const EXAM_CONFIG = {
  title: "AI Coding Workshop 结业考试",
  duration: 1200,
  totalQuestions: 31,
  totalScore: 100,
} as const;
