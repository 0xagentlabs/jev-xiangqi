import { describe, expect, it } from "vitest";
import { Board, createBoard } from "./game";
import { rankCandidates } from "./engine";
describe("xiangqi knowledge engine", () => {
  it("uses book moves initially", () =>
    expect(
      rankCandidates(createBoard(), "red").some((m) =>
        m.reason.includes("开局谱"),
      ),
    ).toBe(true));
  it("returns unique searched candidates", () => {
    const c = rankCandidates(createBoard(), "red");
    expect(c.length).toBeLessThanOrEqual(10);
    expect(new Set(c.map((m) => m.label)).size).toBe(c.length);
  });
  it("looks through a poisoned capture before ranking it", () => {
    const board: Board = Array.from({ length: 10 }, () =>
      Array(9).fill(null),
    );
    board[9][4] = { side: "red", kind: "king" };
    board[0][3] = { side: "black", kind: "king" };
    board[5][0] = { side: "red", kind: "rook" };
    board[4][0] = { side: "black", kind: "pawn" };
    board[0][0] = { side: "black", kind: "rook" };

    const candidates = rankCandidates(board, "red", [], 20);
    const poisoned = candidates.find((move) => move.label === "A5-A6");

    expect(poisoned).toBeDefined();
    expect(candidates[0].label).not.toBe("A5-A6");
    expect(candidates[0].score).toBeGreaterThan(poisoned!.score);
  });
});
