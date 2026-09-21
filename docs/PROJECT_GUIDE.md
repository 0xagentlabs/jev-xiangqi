# Jev 象棋项目使用说明书

## 项目简介

本项目是一款中国象棋 Web 应用，提供人类对战 Jev、Jev 双 AI 自动对弈、棋谱记录、将军提示，以及 Jev 候选概率和决策依据展示。项目不进行浏览器端模型训练；所谓“棋谱学习”由服务端可审计的经典开局谱知识、子力/位置评估和搜索组成，再由 `jev-latest` 从合法候选中选择。

## 架构与目录

- `app/page.tsx`：响应式棋盘、模式切换、BYOK 和决策面板。
- `app/api/move/route.ts`：输入校验、候选生成、Jev System One 调用与返回着法复核。
- `lib/game.ts`：10×9 棋盘、全部棋子规则、将军、将帅照面与合法着法。
- `lib/engine.ts`：分支开局谱、子力与位置评分、选择性三层搜索、将死识别与候选排序。
- `lib/*.test.ts`：规则与引擎单元测试。

## 环境、安装与启动

需要 Node.js 20+、pnpm 11+，以及 TypeSafe API Key。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

在 `.env.local` 中设置 `TYPESAFE_API_KEY=...`，浏览器访问 `http://localhost:3000`。也可点击顶部 HUD 的“配置 API Key”输入；密钥保存在当前浏览器的 `localStorage`，并经 HTTPS 传给本站 API Route。页面内提供 `https://console.typesafe.ai/keys` 获取入口。

## UI 布局

- 顶部 HUD：Jev 品牌、紧凑模式切换和 API 连接状态。
- 桌面端：左侧对局控制、中间 9×10 中国象棋盘、右侧 Jev 决策台；1440×900 下核心区域固定在一屏内，两侧内容独立滚动。
- 平板端：控制区与棋盘并列，决策台下沉为整行。
- 手机端：棋盘优先，控制区和决策区随后纵向排列，无横向滚动。
- 支持键盘焦点、44px 触控目标和 `prefers-reduced-motion`。

## 页面操作

1. 选择“人类 vs Jev”，再选择红方或黑方；红方先行。
2. 点击己方棋子后，绿色圆点标出合法落点；点击落点完成行棋。
3. “Jev vs Jev”模式会自动行棋，可暂停或继续。
4. 左侧查看 ICCS 风格棋谱，例如 `B1-C3`；右侧查看最新候选、概率、耗时与战术说明。
5. 点击回转箭头可重开对局。无合法着法时，页面宣布对方获胜。

## API

`POST /api/move` 接受：

```json
{
  "board": [[null]],
  "side": "red",
  "history": ["B1-C3"],
  "persona": "attack"
}
```

实际 `board` 必须是 10 行 × 9 列；非空格包含 `side` 与 `kind`。服务端限制历史最多 300 着，对请求棋盘和 Jev 返回着法都进行合法性检查。

## 测试、构建与部署

```bash
pnpm test
pnpm lint
pnpm build
vercel --prod
```

单测覆盖初始棋子数、坐标编解码、马腿、炮架、将帅照面、谱库候选，以及避免吃毒兵后丢车的战术回归。候选引擎沿用 Jev 五子棋的混合棋力思路：遍历每个候选后的全部合法应手，找到对手最佳应对，再评估己方最佳续着；API 只向 Jev 提供前五个候选，若首选相对次选有明显分差则由战术核心直接落子，避免模型挑选明显弱着。这不是赛事级深度棋力引擎。Vercel 项目需设置 `TYPESAFE_API_KEY`；若不设置，访问者仍可使用页面 BYOK。

## 棋谱策略

内置谱库覆盖中炮对屏风马、中炮对顺手炮、中炮稳健出子、仙人指路、飞相局、起马局和过宫炮。谱库按完整历史前缀匹配分支，谱着只作为搜索先验；若谱着在当前局面战术上吃亏，三层搜索仍可将其降级。所有谱线都由规则引擎逐手验证合法性。

布局分类和策略参考：[世界象棋联合会入门资料](https://www.wxf-xiangqi.org/images/free_download_books/xiangqi_introduction_chessplayers_20150323.pdf)、[中炮与屏风马说明](https://xiangqimaster.com/zh/openings/central-cannon)、[ECCO 开局分类](https://zh.wikipedia.org/wiki/中国象棋开局编号)。

## 常见问题与安全

- “尚未配置 API Key”：通过顶部 HUD 输入密钥，或配置服务端环境变量。
- Jev 请求失败：检查密钥额度与网络后重试；失败不会改变棋盘。
- 不要提交 `.env.local` 或任何密钥。浏览器密钥持久保存在该站点的 `localStorage` 并发送到本站服务端代理，因此只应在可信设备和可信部署中使用；共享设备使用后应清除站点数据。
- 引擎会拒绝非法棋盘、畸形历史和 Jev 返回的非法着法，但当前演示不实现三次重复、长将判负及 60 回合自然限着等赛事级裁判细则。

## 链接

- GitHub：https://github.com/0xagentlabs/jev-xiangqi
- Vercel：https://jev-xiangqi.vercel.app
