import { describe, expect, it } from "vitest";
import {
  applyMove,
  Board,
  createBoard,
  fromLabel,
  isLegalMove,
  otherSide,
} from "./game";
import { OPENING_LINES, rankCandidates } from "./engine";
describe("xiangqi knowledge engine", () => {
  it("uses book moves initially", () =>
    expect(
      rankCandidates(createBoard(), "red").some((m) =>
        m.reason.includes("开局谱"),
      ),
    ).toBe(true));
  it("keeps every opening repertoire line legal", () => {
    for (const line of OPENING_LINES) {
      let board = createBoard();
      let side = "red" as const | "black";
      for (const label of line.moves) {
        const move = fromLabel(label);
        expect(move, `${line.name}: ${label}`).not.toBeNull();
        expect(isLegalMove(board, side, move!), `${line.name}: ${label}`).toBe(
          true,
        );
        board = applyMove(board, move!);
        side = otherSide(side);
      }
    }
  });
  it("recognizes named branches after the central cannon", () => {
    const opening = fromLabel("H3-E3")!;
    const board = applyMove(createBoard(), opening);
    const candidates = rankCandidates(board, "black", ["H3-E3"], 20);
    expect(candidates.find((move) => move.label === "H10-G8")?.reason).toContain(
      "中炮对屏风马",
    );
    expect(candidates.find((move) => move.label === "H8-E8")?.reason).toContain(
      "中炮对顺手炮",
    );
  });
  it("returns unique searched candidates", () => {
    const c = rankCandidates(createBoard(), "red");
    expect(c.length).toBeLessThanOrEqual(10);
    expect(new Set(c.map((m) => m.label)).size).toBe(c.length);
    expect(c[0].reason).toContain("三层搜索");
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
