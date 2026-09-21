export const ROWS = 10;
export const COLS = 9;
export type Side = "red" | "black";
export type PieceKind =
  | "king"
  | "advisor"
  | "elephant"
  | "horse"
  | "rook"
  | "cannon"
  | "pawn";
export type Piece = { side: Side; kind: PieceKind };
export type Cell = Piece | null;
export type Board = Cell[][];
export type Position = { row: number; col: number };
export type Move = { from: Position; to: Position };
const backRank: PieceKind[] = [
  "rook",
  "horse",
  "elephant",
  "advisor",
  "king",
  "advisor",
  "elephant",
  "horse",
  "rook",
];

export function createBoard(): Board {
  const board = Array.from({ length: ROWS }, () =>
    Array<Cell>(COLS).fill(null),
  );
  backRank.forEach((kind, col) => {
    board[0][col] = { side: "black", kind };
    board[9][col] = { side: "red", kind };
  });
  for (const col of [1, 7]) {
    board[2][col] = { side: "black", kind: "cannon" };
    board[7][col] = { side: "red", kind: "cannon" };
  }
  for (const col of [0, 2, 4, 6, 8]) {
    board[3][col] = { side: "black", kind: "pawn" };
    board[6][col] = { side: "red", kind: "pawn" };
  }
  return board;
}
export const otherSide = (side: Side): Side =>
  side === "red" ? "black" : "red";
export const samePosition = (a: Position, b: Position) =>
  a.row === b.row && a.col === b.col;
export const toLabel = (move: Move) =>
  `${String.fromCharCode(65 + move.from.col)}${10 - move.from.row}-${String.fromCharCode(65 + move.to.col)}${10 - move.to.row}`;
export function fromLabel(label: string): Move | null {
  const m = /^([A-I])(10|[1-9])-([A-I])(10|[1-9])$/i.exec(label);
  return m
    ? {
        from: {
          col: m[1].toUpperCase().charCodeAt(0) - 65,
          row: 10 - Number(m[2]),
        },
        to: {
          col: m[3].toUpperCase().charCodeAt(0) - 65,
          row: 10 - Number(m[4]),
        },
      }
    : null;
}
export function applyMove(board: Board, move: Move): Board {
  const next = board.map((row) =>
    row.map((piece) => (piece ? { ...piece } : null)),
  );
  next[move.to.row][move.to.col] = next[move.from.row][move.from.col];
  next[move.from.row][move.from.col] = null;
  return next;
}
function palace(side: Side, p: Position) {
  return p.col >= 3 && p.col <= 5 && (side === "red" ? p.row >= 7 : p.row <= 2);
}
function clearBetween(board: Board, from: Position, to: Position) {
  let count = 0;
  const dr = Math.sign(to.row - from.row),
    dc = Math.sign(to.col - from.col);
  for (
    let r = from.row + dr, c = from.col + dc;
    r !== to.row || c !== to.col;
    r += dr, c += dc
  )
    if (board[r][c]) count++;
  return count;
}

export function pseudoMoves(board: Board, from: Position): Position[] {
  const piece = board[from.row]?.[from.col];
  if (!piece) return [];
  const moves: Position[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const to = { row, col },
        target = board[row][col];
      if ((row === from.row && col === from.col) || target?.side === piece.side)
        continue;
      const dr = row - from.row,
        dc = col - from.col,
        ar = Math.abs(dr),
        ac = Math.abs(dc);
      let valid = false;
      if (piece.kind === "king")
        valid = palace(piece.side, to) && ar + ac === 1;
      if (piece.kind === "advisor")
        valid = palace(piece.side, to) && ar === 1 && ac === 1;
      if (piece.kind === "elephant")
        valid =
          ar === 2 &&
          ac === 2 &&
          (piece.side === "red" ? row >= 5 : row <= 4) &&
          !board[from.row + dr / 2][from.col + dc / 2];
      if (piece.kind === "horse") {
        if (ar === 2 && ac === 1) valid = !board[from.row + dr / 2][from.col];
        if (ar === 1 && ac === 2) valid = !board[from.row][from.col + dc / 2];
      }
      if (piece.kind === "rook")
        valid = (dr === 0 || dc === 0) && clearBetween(board, from, to) === 0;
      if (piece.kind === "cannon")
        valid =
          (dr === 0 || dc === 0) &&
          clearBetween(board, from, to) === (target ? 1 : 0);
      if (piece.kind === "pawn") {
        const forward = piece.side === "red" ? -1 : 1;
        const crossed = piece.side === "red" ? from.row <= 4 : from.row >= 5;
        valid =
          (dr === forward && dc === 0) || (crossed && dr === 0 && ac === 1);
      }
      if (valid) moves.push(to);
    }
  return moves;
}
function findKing(board: Board, side: Side): Position | null {
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      if (board[row][col]?.side === side && board[row][col]?.kind === "king")
        return { row, col };
  return null;
}
export function isInCheck(board: Board, side: Side): boolean {
  const king = findKing(board, side);
  if (!king) return true;
  const enemyKing = findKing(board, otherSide(side));
  if (
    enemyKing &&
    enemyKing.col === king.col &&
    clearBetween(board, enemyKing, king) === 0
  )
    return true;
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const piece = board[row][col];
      if (
        piece?.side === otherSide(side) &&
        pseudoMoves(board, { row, col }).some((to) => samePosition(to, king))
      )
        return true;
    }
  return false;
}
export function legalMoves(board: Board, side: Side): Move[] {
  const result: Move[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      if (board[row][col]?.side !== side) continue;
      const from = { row, col };
      for (const to of pseudoMoves(board, from)) {
        const move = { from, to };
        if (!isInCheck(applyMove(board, move), side)) result.push(move);
      }
    }
  return result;
}
export const isLegalMove = (board: Board, side: Side, move: Move) =>
  legalMoves(board, side).some(
    (m) => samePosition(m.from, move.from) && samePosition(m.to, move.to),
  );
export const getWinner = (board: Board, turn: Side): Side | null =>
  legalMoves(board, turn).length ? null : otherSide(turn);
export function serializeBoard(board: Board): string {
  const code: Record<PieceKind, string> = {
    king: "K",
    advisor: "A",
    elephant: "E",
    horse: "H",
    rook: "R",
    cannon: "C",
    pawn: "P",
  };
  const pieces: string[] = [];
  board.forEach((row, r) =>
    row.forEach((piece, c) => {
      if (piece)
        pieces.push(
          `${piece.side[0].toUpperCase()}${code[piece.kind]}@${String.fromCharCode(65 + c)}${10 - r}`,
        );
    }),
  );
  return pieces.join(",");
}
