import {
  applyMove,
  Board,
  isInCheck,
  legalMoves,
  Move,
  otherSide,
  PieceKind,
  Side,
  toLabel,
} from "./game";
export type Candidate = Move & {
  label: string;
  score: number;
  reason: string;
  forced: "win" | "check" | "capture" | null;
};
const VALUE: Record<PieceKind, number> = {
  king: 100000,
  rook: 900,
  cannon: 450,
  horse: 420,
  elephant: 200,
  advisor: 200,
  pawn: 110,
};
const BOOK: Record<string, string[]> = {
  "": ["B1-C3", "H1-G3", "B3-E3", "H3-E3", "E4-E5"],
  "B1-C3": ["H10-G8", "B8-E8", "E7-E6"],
  "H1-G3": ["B10-C8", "H8-E8", "E7-E6"],
};
// One complete opponent reply is a large improvement over the former static
// evaluation while keeping an API move comfortably interactive.
const SEARCH_DEPTH = 1;
const MATE_SCORE = 1_000_000;

function movePriority(board: Board, move: Move) {
  const target = board[move.to.row][move.to.col];
  return target
    ? VALUE[target.kind] * 10 -
        VALUE[board[move.from.row][move.from.col]!.kind]
    : 0;
}
function evaluate(board: Board, side: Side) {
  let score = 0;
  board.forEach((row, r) =>
    row.forEach((piece, c) => {
      if (!piece) return;
      let value = VALUE[piece.kind];
      if (piece.kind === "pawn" && (piece.side === "red" ? r <= 4 : r >= 5))
        value += 65 + (4 - Math.abs(c - 4)) * 5;
      if (piece.kind === "horse" || piece.kind === "cannon")
        value += 12 - Math.abs(c - 4) * 2;
      score += piece.side === side ? value : -value;
    }),
  );
  if (isInCheck(board, otherSide(side))) score += 45;
  if (isInCheck(board, side)) score -= 55;
  return score;
}
function search(
  board: Board,
  perspective: Side,
  turn: Side,
  depth: number,
  alpha: number,
  beta: number,
  ply = 0,
): number {
  const moves = legalMoves(board, turn);
  if (!moves.length)
    return turn === perspective ? -MATE_SCORE + ply : MATE_SCORE - ply;
  if (!depth) return evaluate(board, perspective);
  const max = turn === perspective;
  let best = max ? -Infinity : Infinity;
  const ordered = moves.sort(
    (a, b) => movePriority(board, b) - movePriority(board, a),
  );
  for (const move of ordered) {
    const score = search(
      applyMove(board, move),
      perspective,
      otherSide(turn),
      depth - 1,
      alpha,
      beta,
      ply + 1,
    );
    best = max ? Math.max(best, score) : Math.min(best, score);
    if (max) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}
export function rankCandidates(
  board: Board,
  side: Side,
  history: string[] = [],
  limit = 10,
): Candidate[] {
  const book = BOOK[history.join(",")] ?? [];
  const shortlist = legalMoves(board, side)
    .map((move) => {
      const target = board[move.to.row][move.to.col];
      const next = applyMove(board, move);
      const check = isInCheck(next, otherSide(side));
      const label = toLabel(move);
      const bookIndex = book.indexOf(label);
      const ordering =
        (target ? VALUE[target.kind] : 0) +
        (check ? 120 : 0) +
        (bookIndex >= 0 ? 500 - bookIndex : 0) +
        evaluate(next, side);
      return { move, target, next, check, label, bookIndex, ordering };
    })
    .sort((a, b) => b.ordering - a.ordering)
    .slice(0, 18);
  return shortlist
    .map(({ move, target, next, check, label, bookIndex }) => {
      const won =
        target?.kind === "king" || legalMoves(next, otherSide(side)).length === 0;
      const score = won
        ? MATE_SCORE
        : search(
            next,
            side,
            otherSide(side),
            SEARCH_DEPTH,
            -Infinity,
            Infinity,
          ) +
          (bookIndex >= 0 ? 180 - bookIndex * 15 : 0);
      const reason = won
        ? "形成绝杀"
        : [
            bookIndex >= 0 ? "经典开局谱着" : "",
            target ? `吃${target.kind}` : "",
            check ? "将军" : "",
            "局面搜索评估",
          ]
            .filter(Boolean)
            .join("；");
      return {
        ...move,
        label,
        score,
        reason,
        forced: won
          ? ("win" as const)
          : check
            ? ("check" as const)
            : target
              ? ("capture" as const)
              : null,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
