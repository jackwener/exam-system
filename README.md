# AI Coding Workshop 在线考试系统

一套面向技术团队内训结业考试的轻量考试平台：考生答题 → AI 自动评分 → 管理员后台看成绩。支持客观题（选择 / 多选 / 判断）+ 主观题（简答 / 场景分析），主观题由 GLM / Claude 自动打分。

## 功能

### 考生端
- 链接 + 姓名即可开考（无需注册）
- 单题模式，左右方向键切换
- 答案**每次切题自动保存**（容忍网络抖动和刷新）
- 20 分钟倒计时，最后 5 分钟变红闪烁，到时自动提交
- 提交后轮询评分状态，完成后显示总分 + 各题型分数明细

### 管理员后台
- 密码登录（HMAC-SHA256 签名 cookie，24h 过期）
- 成绩总览：参考人数 / 平均分 / 及格率 / 最高分
- 逐人查看答卷详情 + AI 评语
- CSV 一键导出
- 一键重评失败题（transient GLM API failure 恢复）
- 未作答客观题按默认满分补齐（网络丢失补偿）
- 清空所有考试数据（需二次输入确认）

### AI 自动评分
- 客观题：与标准答案直接比对（多选题规则：全对满分、漏选半分、错选 0 分）
- 主观题：调 LLM（默认 GLM-4.5，可切换到 Claude Haiku）按 rubric 评分
- **4 次重试 + 指数退避**，抵抗高并发提交时的限流和瞬时错误
- **Markdown code fence 自动剥离** — 处理 LLM 返回 ` ```json ... ``` ` 包裹
- 评分 prompt 强调「合情合理就给分」，扣分必须在 feedback 里举证

## 技术栈

- **Next.js 16**（App Router、Server Components、Proxy middleware）
- **TypeScript + Tailwind CSS v4**
- **Redis（ioredis）** — 存考卷 / 答案 / 评分
- **Anthropic SDK + 自定义 baseURL** — 兼容智谱 GLM 等 Anthropic 协议 LLM
- **PM2** 进程守护 + systemd 自启

## 部署（阿里云 ECS / 任何 Linux 服务器）

### 1. 系统依赖

```bash
# Node.js 20+（Alibaba Cloud Linux / Anolis 示例）
dnf install -y nodejs git redis

# PM2
npm install -g pm2

# Redis 启动
systemctl enable --now redis
redis-cli ping  # → PONG
```

### 2. 拉代码并安装

```bash
git clone git@github.com:YOUR_USER/exam-system.git
cd exam-system
npm install
```

### 3. 配环境变量

创建 `.env.local`（**不要提交到 git**）：

```bash
# LLM（智谱 GLM-4.5 示例，也可换成官方 Claude）
ANTHROPIC_API_KEY=你的API密钥
ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic

# 管理员登录密码
ADMIN_PASSWORD=workshop2026

# 本地 Redis
REDIS_URL=redis://127.0.0.1:6379

# 监听端口
PORT=18888
NODE_ENV=production
```

### 4. 构建并启动

```bash
npm run build

cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'exam',
    cwd: __dirname,
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 18888',
    env: { NODE_ENV: 'production', PORT: '18888' },
  }],
};
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

### 5. 放行端口

- **阿里云 ECS** → 安全组入方向添加 `TCP 18888`
- **本机防火墙** → `firewall-cmd --permanent --add-port=18888/tcp && firewall-cmd --reload`

访问 `http://your.server.ip:18888/exam`

### 6. 更新流程

项目根目录自带 `deploy.sh`：

```bash
./deploy.sh
```

依次执行 `git pull` → `npm install` → `npm run build` → `pm2 restart exam`。

## 试卷内容定制

所有题目、答案、评分标准都在 `lib/` 下的静态文件：

- `lib/questions.ts` — 题目（按 section 分组，choiceQ/mcQ/tfQ/saQ/scQ 5 种辅助函数）
- `lib/answers.ts` — 标准答案（客观题）+ 评分 rubric（主观题）
- `lib/types.ts` — 类型定义

改完题目 `npm run build` 再 `pm2 restart` 即可。

### 分值结构（示例）

| 题型 | 题量 | 单题分 | 小计 |
|------|------|--------|------|
| 选择题 | 13 | 3 | 39 |
| 多选题 | 5 | 4 | 20 |
| 判断题 | 10 | 2 | 20 |
| 简答题 | 2 | 10-11 | 21 |
| **合计** | **30** | | **100** |

## Admin API

都需要管理员 cookie（通过 `/admin/login` 登录后获得）。

| 端点 | 方法 | 作用 |
|------|------|------|
| `/api/admin/auth` | POST | 登录 |
| `/api/admin/export` | GET | 下载成绩 CSV |
| `/api/admin/clear` | POST | 清空所有考试数据 |
| `/api/admin/regrade` | POST | 重评失败主观题（`{all:true}` 或 `{examId}`）|
| `/api/admin/fill-missing` | POST | 未作答客观题按满分补齐 |
| `/api/admin/rescore-all` | POST | 按当前 `questions.ts` 分值重算所有历史考卷 |

## 项目结构

```
exam-system/
├── app/
│   ├── exam/                    # 考生端（/exam 入口、/exam/[id] 答题、/exam/[id]/result）
│   ├── admin/                   # 管理后台（/admin/login、/admin/dashboard、/admin/exam/[id]）
│   └── api/
│       ├── exam/                # 考生端 API（start / save / submit / status / load）
│       └── admin/               # 管理端 API（auth / export / clear / regrade / ...）
├── lib/
│   ├── questions.ts             # 题目数据
│   ├── answers.ts               # 答案 + rubric
│   ├── grading.ts               # 评分引擎（客观比对 + AI 调用 + 重试）
│   ├── kv.ts                    # Redis 封装
│   ├── auth.ts                  # HMAC cookie 签名
│   └── types.ts
├── components/                  # 前端组件
├── proxy.ts                     # Next.js 16 middleware（/admin 和 /api/admin 鉴权）
└── deploy.sh                    # 一键更新脚本
```

## 安全说明

- 管理员密码仅存在环境变量，**不入代码**
- Cookie 用 `HMAC-SHA256(ADMIN_PASSWORD, payload)` 签名 + 时间戳，无法伪造
- `proxy.ts` 统一拦截 `/admin/*` 和 `/api/admin/*`（放行 `/api/admin/auth`）
- `.env.local` 在 `.gitignore` 中，私钥永不提交
- 考生端 API 不需要认证（靠 nanoid(10) 生成的 examId 作为弱口令防护，适用于内部可信场景）

## License

MIT —— 欢迎 fork 作为你们自己 workshop / 培训的考试模板。
