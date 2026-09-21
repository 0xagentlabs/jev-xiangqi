# Jev 象棋

使用 TypeSafe AI 官方 Jev System One API 驱动的中国象棋对弈场，支持“人类 vs Jev”和“Jev vs Jev”。完整实现标准棋子走法、将军与将帅照面规则，以经典开局谱、局面评估和候选搜索约束 Jev 的结构化决策。

## 本地运行

要求 Node.js 20+ 与 pnpm。

```bash
pnpm install
cp .env.example .env.local
# 在 .env.local 中填写 TYPESAFE_API_KEY
pnpm dev
```

也可在顶部 HUD 输入 TypeSafe API Key；它只保存在当前浏览器的 `localStorage`。可前往 [TypeSafe Console](https://console.typesafe.ai/keys) 获取 Key。

## 竞技场界面

页面采用 Jev 系列统一的东方策略竞技场：顶部 HUD 集中品牌、对局模式与连接状态；桌面端为“对局控制 / 中国象棋盘 / Jev 决策台”三栏，平板改为两栏，手机按棋盘、控制、决策顺序纵向排列。棋盘保留 9×10 木质棋盘、楚河汉界与红黑棋子语义。

## 验证

```bash
pnpm test
pnpm lint
pnpm build
```

完整说明见 `docs/PROJECT_GUIDE.md`。
