# Jev 象棋

使用 TypeSafe AI 官方 Jev System One API 驱动的中国象棋对弈场，支持“人类 vs Jev”和“Jev vs Jev”。完整实现标准棋子走法、将军与将帅照面规则，以经典开局谱、局面评估和候选搜索约束 Jev 的结构化决策。

棋力管线内置中炮、屏风马、顺手炮、仙人指路、飞相、起马和过宫炮分支谱系，并以选择性三层搜索校正谱着和候选，避免脱离局面机械背谱。

## 本地运行

要求 Node.js 20+ 与 pnpm。

```bash
pnpm install
cp .env.example .env.local
# 在 .env.local 中填写 TYPESAFE_API_KEY
pnpm dev
```

也可在页面中输入 TypeSafe API Key；它只保存在浏览器 `sessionStorage`，关闭标签页后清除。

## 验证

```bash
pnpm test
pnpm lint
pnpm build
```

完整说明见 `docs/PROJECT_GUIDE.md`。
