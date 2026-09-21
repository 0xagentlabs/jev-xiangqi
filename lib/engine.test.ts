import { describe, expect, it } from "vitest";
import { createBoard } from "./game";
import { rankCandidates } from "./engine";
describe("xiangqi knowledge engine", () => {
  it("uses book moves initially", () => expect(rankCandidates(createBoard(), "red").some((m) => m.reason.includes("开局谱"))).toBe(true));
  it("returns unique searched candidates", () => { const c = rankCandidates(createBoard(), "red"); expect(c.length).toBeLessThanOrEqual(10); expect(new Set(c.map((m) => m.label)).size).toBe(c.length); });
});
