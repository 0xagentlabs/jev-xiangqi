# Jev 象棋项目使用说明书

## 项目简介

本项目是一款中国象棋 Web 应用，提供人类对战 Jev、Jev 双 AI 自动对弈、棋谱记录、将军提示，以及 Jev 候选概率和决策依据展示。项目不进行浏览器端模型训练；所谓“棋谱学习”由服务端可审计的经典开局谱知识、子力/位置评估和搜索组成，再由 `jev-latest` 从合法候选中选择。

## 架构与目录

- `app/page.tsx`：响应式棋盘、模式切换、BYOK 和决策面板。
- `app/api/move/route.ts`：输入校验、候选生成、Jev System One 调用与返回着法复核。
- `lib/game.ts`：10×9 棋盘、全部棋子规则、将军、将帅照面与合法着法。
- `lib/engine.ts`：开局谱、子力与位置评分、对手全应手搜索、将死识别与候选排序。
- `lib/*.test.ts`：规则与引擎单元测试。

## 环境、安装与启动

需要 Node.js 20+、pnpm 11+，以及 TypeSafe API Key。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

在 `.env.local` 中设置 `TYPESAFE_API_KEY=...`，浏览器访问 `http://localhost:3000`。也可点击右上角“配置 API Key”临时输入，密钥只存于当前会话并经 HTTPS 传给本站 API Route。

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

单测覆盖初始棋子数、坐标编解码、马腿、炮架、将帅照面、谱库候选，以及避免吃毒兵后丢车的战术回归。候选引擎会遍历每个候选后的全部合法应手，避免只看眼前吃子；这不是赛事级深度棋力引擎。Vercel 项目需设置 `TYPESAFE_API_KEY`；若不设置，访问者仍可使用页面 BYOK。

## 常见问题与安全

- “尚未配置 API Key”：在页面右上角输入密钥，或配置服务端环境变量。
- Jev 请求失败：检查密钥额度与网络后重试；失败不会改变棋盘。
- 不要提交 `.env.local` 或任何密钥。浏览器密钥会发送到本站服务端代理，因此只应在可信部署中使用。
- 引擎会拒绝非法棋盘、畸形历史和 Jev 返回的非法着法，但当前演示不实现三次重复、长将判负及 60 回合自然限着等赛事级裁判细则。

## 链接

- GitHub：https://github.com/0xagentlabs/jev-xiangqi
- Vercel：https://jev-xiangqi.vercel.app
