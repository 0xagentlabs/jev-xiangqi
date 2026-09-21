import { describe, expect, it } from "vitest";
import { applyMove, createBoard, fromLabel, isInCheck, isLegalMove, legalMoves, toLabel } from "./game";
describe("xiangqi rules", () => {
  it("creates a standard 32-piece position", () => expect(createBoard().flat().filter(Boolean)).toHaveLength(32));
  it("round trips notation", () => { const move = { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } }; expect(fromLabel(toLabel(move))).toEqual(move); });
  it("allows a horse opening and blocks its leg", () => { const board = createBoard(); expect(isLegalMove(board, "red", { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } })).toBe(true); board[8][1] = { side: "red", kind: "pawn" }; expect(isLegalMove(board, "red", { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } })).toBe(false); });
  it("requires a cannon screen to capture", () => expect(isLegalMove(createBoard(), "red", { from: { row: 7, col: 1 }, to: { row: 0, col: 1 } })).toBe(true));
  it("prevents exposing facing kings", () => { const board = createBoard().map((row) => row.map(() => null)); board[0][4] = { side: "black", kind: "king" }; board[9][4] = { side: "red", kind: "king" }; board[5][4] = { side: "red", kind: "rook" }; expect(legalMoves(board, "red").some((m) => m.from.row === 5 && m.to.col !== 4)).toBe(false); expect(isInCheck(applyMove(board, { from: { row: 5, col: 4 }, to: { row: 5, col: 3 } }), "red")).toBe(true); });
});
