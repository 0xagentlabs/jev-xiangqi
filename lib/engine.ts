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
type OpeningLine = { name: string; moves: string[] };

// Short, sound repertoires rather than a single memorized line. Every line is
// replayed through the rules engine in tests so stale or illegal book data
// cannot silently enter production.
export const OPENING_LINES: OpeningLine[] = [
  {
    name: "中炮对屏风马",
    moves: [
      "H3-E3",
      "H10-G8",
      "H1-G3",
      "B10-C8",
      "I1-H1",
      "A10-B10",
      "C4-C5",
      "C7-C6",
    ],
  },
  {
    name: "中炮对顺手炮",
    moves: ["H3-E3", "H8-E8", "H1-G3", "H10-G8", "I1-H1", "I10-H10"],
  },
  {
    name: "中炮稳健出子",
    moves: ["H3-E3", "B10-C8", "H1-G3", "H10-G8", "C4-C5", "C7-C6"],
  },
  {
    name: "仙人指路",
    moves: ["C4-C5", "C7-C6", "H1-G3", "H10-G8", "I1-H1", "I10-H10"],
  },
  {
    name: "飞相局",
    moves: ["G1-E3", "C7-C6", "H1-G3", "H10-G8", "I1-H1", "I10-H10"],
  },
  {
    name: "起马局",
    moves: ["H1-G3", "C7-C6", "I1-H1", "H10-G8", "C4-C5", "B10-C8"],
  },
  {
    name: "过宫炮",
    moves: ["H3-F3", "H10-G8", "H1-G3", "B10-C8", "I1-H1", "A10-B10"],
  },
];

function openingMoves(history: string[]) {
  const matches = OPENING_LINES.filter(
    (line) =>
      history.length < line.moves.length &&
      history.every((move, index) => line.moves[index] === move),
  );
  const unique = new Map<string, { name: string; priority: number }>();
  matches.forEach((line, index) => {
    const move = line.moves[history.length];
    if (!unique.has(move)) unique.set(move, { name: line.name, priority: index });
  });
  return unique;
}
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
function selectiveThreePly(board: Board, perspective: Side) {
  const opponent = otherSide(perspective);
  const replies = legalMoves(board, opponent).sort(
    (a, b) => movePriority(board, b) - movePriority(board, a),
  );
  if (!replies.length)
    return { score: MATE_SCORE, reply: null, continuation: null };

  let worst: { score: number; move: Move; board: Board } | null = null;
  for (const move of replies) {
    const afterReply = applyMove(board, move);
    const continuations = legalMoves(afterReply, perspective);
    const score = continuations.length
      ? evaluate(afterReply, perspective)
      : -MATE_SCORE + 1;
    if (!worst || score < worst.score)
      worst = { score, move, board: afterReply };
  }

  const continuations = legalMoves(worst!.board, perspective);
  let bestContinuation: { score: number; move: Move } | null = null;
  for (const move of continuations) {
    const next = applyMove(worst!.board, move);
    const score = legalMoves(next, opponent).length
      ? evaluate(next, perspective)
      : MATE_SCORE - 2;
    if (!bestContinuation || score > bestContinuation.score)
      bestContinuation = { score, move };
  }

  return {
    score:
      worst!.score * 0.78 +
      (bestContinuation?.score ?? worst!.score) * 0.22,
    reply: worst!.move,
    continuation: bestContinuation?.move ?? null,
  };
}
export function rankCandidates(
  board: Board,
  side: Side,
  history: string[] = [],
  limit = 10,
): Candidate[] {
  const book = openingMoves(history);
  const shortlist = legalMoves(board, side)
    .map((move) => {
      const target = board[move.to.row][move.to.col];
      const next = applyMove(board, move);
      const check = isInCheck(next, otherSide(side));
      const label = toLabel(move);
      const bookEntry = book.get(label);
      const ordering =
        (target ? VALUE[target.kind] : 0) +
        (check ? 120 : 0) +
        (bookEntry ? 500 - bookEntry.priority : 0) +
        evaluate(next, side);
      return { move, target, next, check, label, bookEntry, ordering };
    })
    .sort((a, b) => b.ordering - a.ordering)
    .slice(0, 18);
  return shortlist
    .map(({ move, target, next, check, label, bookEntry }) => {
      const won =
        target?.kind === "king" || legalMoves(next, otherSide(side)).length === 0;
      const searched = won ? null : selectiveThreePly(next, side);
      const score = won
        ? MATE_SCORE
        : searched!.score +
          (bookEntry ? 180 - bookEntry.priority * 15 : 0);
      const reason = won
        ? "形成绝杀"
        : [
            bookEntry ? `经典开局谱着：${bookEntry.name}` : "",
            target ? `吃${target.kind}` : "",
            check ? "将军" : "",
            searched?.reply
              ? `三层搜索 对手最佳${toLabel(searched.reply)}${searched.continuation ? `，续着${toLabel(searched.continuation)}` : ""}`
              : "局面搜索评估",
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
