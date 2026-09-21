import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jev 象棋 — System One 对弈场",
  description: "融合中国象棋棋谱、搜索引擎与 TypeSafe Jev 决策的人机对弈场。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
