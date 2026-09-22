"use client";
import {
  Bot,
  BrainCircuit,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  RotateCcw,
  Swords,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyMove,
  Board,
  createBoard,
  getWinner,
  isInCheck,
  legalMoves,
  Move,
  Position,
  samePosition,
  Side,
  toLabel,
} from "@/lib/game";
type Mode = "human" | "duel";
type JevResult = {
  label: string;
  confidence?: number;
  probabilities: { label: string; probability: number }[];
  latencyMs: number;
  move: Move;
  tactic?: string;
};
const glyph = {
  red: {
    king: "帅",
    advisor: "仕",
    elephant: "相",
    horse: "马",
    rook: "车",
    cannon: "炮",
    pawn: "兵",
  },
  black: {
    king: "将",
    advisor: "士",
    elephant: "象",
    horse: "马",
    rook: "车",
    cannon: "炮",
    pawn: "卒",
  },
} as const;
const sideName = (side: Side) => (side === "red" ? "红方" : "黑方");
export default function Home() {
  const [board, setBoard] = useState<Board>(createBoard),
    [turn, setTurn] = useState<Side>("red"),
    [mode, setMode] = useState<Mode>("human"),
    [humanSide, setHumanSide] = useState<Side>("red"),
    [selected, setSelected] = useState<Position | null>(null),
    [lastMove, setLastMove] = useState<Move | null>(null),
    [thinking, setThinking] = useState(false),
    [autoPlay, setAutoPlay] = useState(false),
    [configured, setConfigured] = useState<boolean | null>(null),
    [jevKey, setJevKey] = useState(""),
    [keyDraft, setKeyDraft] = useState(""),
    [showKey, setShowKey] = useState(false),
    [showKeyPrompt, setShowKeyPrompt] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<JevResult | null>(null),
    [history, setHistory] = useState<string[]>([]);
  const requestId = useRef(0),
    winner = useMemo(() => getWinner(board, turn), [board, turn]),
    gameOver = Boolean(winner),
    targets = useMemo(
      () =>
        selected
          ? legalMoves(board, turn)
              .filter((m) => samePosition(m.from, selected))
              .map((m) => m.to)
          : [],
      [board, selected, turn],
    );
  useEffect(() => {
    const saved = localStorage.getItem("jev_typesafe_api_key") ?? "";
    setJevKey(saved);
    setKeyDraft(saved);
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setConfigured(Boolean(d.configured || saved));
        if (!d.configured && !saved) setShowKeyPrompt(true);
      })
      .catch(() => setConfigured(Boolean(saved)));
  }, []);
  const reset = useCallback(
    (nextMode = mode, side = humanSide) => {
      requestId.current++;
      setBoard(createBoard());
      setTurn("red");
      setSelected(null);
      setLastMove(null);
      setHistory([]);
      setResult(null);
      setError("");
      setThinking(false);
      setMode(nextMode);
      setHumanSide(side);
      setAutoPlay(nextMode === "duel");
    },
    [humanSide, mode],
  );
  const commit = useCallback(
    (active: Board, move: Move, side: Side, ai?: JevResult) => {
      setBoard(applyMove(active, move));
      setLastMove(move);
      setSelected(null);
      setHistory((h) => [...h, toLabel(move)]);
      setResult(ai ?? null);
      setTurn(side === "red" ? "black" : "red");
    },
    [],
  );
  const askJev = useCallback(
    async (active: Board, side: Side) => {
      if (!configured) {
        setShowKeyPrompt(true);
        setAutoPlay(false);
        return;
      }
      const id = ++requestId.current;
      setThinking(true);
      setError("");
      try {
        const response = await fetch("/api/move", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(jevKey ? { "X-TypeSafe-API-Key": jevKey } : {}),
          },
          body: JSON.stringify({
            board: active,
            side,
            history,
            persona: side === "red" ? "attack" : "defense",
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Jev 决策失败");
        if (requestId.current === id) commit(active, data.move, side, data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Jev 决策失败");
        setAutoPlay(false);
      } finally {
        if (requestId.current === id) setThinking(false);
      }
    },
    [commit, configured, history, jevKey],
  );
  useEffect(() => {
    if (
      gameOver ||
      thinking ||
      !(
        (mode === "human" && turn !== humanSide) ||
        (mode === "duel" && autoPlay)
      )
    )
      return;
    const timer = setTimeout(
      () => askJev(board, turn),
      mode === "duel" ? 700 : 250,
    );
    return () => clearTimeout(timer);
  }, [askJev, autoPlay, board, gameOver, humanSide, mode, thinking, turn]);
  function clickCell(position: Position) {
    if (mode !== "human" || turn !== humanSide || thinking || gameOver) return;
    const piece = board[position.row][position.col];
    if (selected && targets.some((p) => samePosition(p, position)))
      return commit(board, { from: selected, to: position }, turn);
    setSelected(piece?.side === turn ? position : null);
  }
  function saveKey() {
    const value = keyDraft.trim();
    if (!value || value.length > 512)
      return setError("请输入有效的 TypeSafe API Key。");
    localStorage.setItem("jev_typesafe_api_key", value);
    setJevKey(value);
    setConfigured(true);
    setShowKeyPrompt(false);
    setError("");
  }
  return (
    <main className="arena">
      <header className="topbar">
        <a className="brand" href="#game">
          <span className="brand-mark">
            <BrainCircuit size={20} />
          </span>
          <span>Jev 象棋</span>
          <small>AI Strategy Arena</small>
        </a>
        <div className="hud-actions">
          <div className="mode-switch" aria-label="对局模式">
            <button className={mode === "human" ? "active" : ""} aria-pressed={mode === "human"} onClick={() => reset("human", humanSide)}>
              <UserRound aria-hidden="true" /> <span>人类 vs Jev</span>
            </button>
            <button className={mode === "duel" ? "active" : ""} aria-pressed={mode === "duel"} onClick={() => reset("duel", humanSide)}>
              <Swords aria-hidden="true" /> <span>Jev vs Jev</span>
            </button>
          </div>
          <button
            className={`api-pill ${configured ? "ready" : "missing"}`}
            onClick={() => setShowKeyPrompt(true)}
            aria-label={configured ? "Jev 已连接，管理 API Key" : "配置 API Key"}
          >
            <span aria-hidden="true" />
            {configured ? "Jev 已连接" : "配置 API Key"}
          </button>
        </div>
      </header>
      <section id="game" className="game-shell xiangqi-shell">
        <aside className="panel left-panel">
          <div className="panel-heading">
            <span>对局控制</span>
            <button
              className="icon-button"
              onClick={() => reset()}
              aria-label="重新开始"
            >
              <RotateCcw size={17} />
            </button>
          </div>
          {mode === "human" && (
            <div className="setting">
              <label>你的阵营</label>
              <div className="segmented">
                <button
                  className={humanSide === "red" ? "selected" : ""}
                  aria-pressed={humanSide === "red"}
                  onClick={() => reset("human", "red")}
                >
                  红方
                </button>
                <button
                  className={humanSide === "black" ? "selected" : ""}
                  aria-pressed={humanSide === "black"}
                  onClick={() => reset("human", "black")}
                >
                  黑方
                </button>
              </div>
            </div>
          )}
          <div className="turn-card">
            <span className={`turn-stone ${turn}`} />
            <div>
              <small>当前状态</small>
              <strong>
                {winner
                  ? `${sideName(winner)}胜`
                  : thinking
                    ? "Jev 思考中"
                    : `${sideName(turn)}${isInCheck(board, turn) ? "被将军" : "行棋"}`}
              </strong>
            </div>
            {thinking && (
              <span className="thinking-dots" aria-label="Jev 正在思考">
                <i /><i /><i />
              </span>
            )}
          </div>
          {mode === "duel" && (
            <button
              className="wide-button"
              onClick={() => setAutoPlay((v) => !v)}
            >
              {autoPlay ? "暂停对局" : "继续对局"}
            </button>
          )}
          <div className="move-list">
            <div className="section-label">
              棋谱 <span>{history.length}</span>
            </div>
            {history.length ? (
              history
                .slice()
                .reverse()
                .map((label, i) => (
                  <div className="move-row" key={`${i}-${label}`}>
                    <span
                      className={`move-no ${(history.length - i) % 2 ? "red" : "black"}`}
                    >
                      {history.length - i}
                    </span>
                    <strong>{label}</strong>
                  </div>
                ))
            ) : (
              <p className="empty">请红方先行。</p>
            )}
          </div>
        </aside>
        <div className="board-wrap xiangqi-wrap">
          <div className="xiangqi-board" role="grid" aria-label="中国象棋棋盘">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const pos = { row: r, col: c },
                  isSelected = selected && samePosition(selected, pos),
                  target = targets.some((p) => samePosition(p, pos)),
                  last =
                    lastMove &&
                    (samePosition(lastMove.from, pos) ||
                      samePosition(lastMove.to, pos));
                return (
                  <button
                    key={`${r}-${c}`}
                    className={`x-cell ${isSelected ? "selected" : ""} ${target ? "target" : ""} ${last ? "last" : ""}`}
                    style={{
                      left: `${c * 12.5}%`,
                      top: `${r * (100 / 9)}%`,
                    }}
                    onClick={() => clickCell(pos)}
                    aria-pressed={Boolean(isSelected)}
                    aria-label={`${String.fromCharCode(65 + c)}${10 - r}${piece ? ` ${sideName(piece.side)}${glyph[piece.side][piece.kind]}` : " 空位"}`}
                  >
                    {piece && (
                      <span className={`x-piece ${piece.side}`}>
                        {glyph[piece.side][piece.kind]}
                      </span>
                    )}
                  </button>
                );
              }),
            )}
            <div className="river">
              <span>楚 河</span>
              <span>漢 界</span>
            </div>
          </div>
          <div className="board-status">
            <span>{mode === "human" ? "HUMAN × JEV" : "JEV × JEV"}</span>
            <span>9 路 · 10 横</span>
          </div>
          {gameOver && (
            <div className="game-over">
              <small>CHECKMATE</small>
              <strong>{sideName(winner!)}获胜</strong>
              <button onClick={() => reset()}>再来一局</button>
            </div>
          )}
        </div>
        <aside className="panel insight-panel">
          <div className="panel-heading">
            <span>Jev 决策台</span>
            <span className="live-dot">LIVE</span>
          </div>
          <div className="model-card">
            <small>XIANGQI ENGINE</small>
            <strong>Opening Book × Search</strong>
              <span>Position Search + jev-latest</span>
          </div>
          {result ? (
            <>
              <div className="decision-hero">
                <small>最新选择</small>
                <strong>{result.label}</strong>
                <span>{result.latencyMs} ms</span>
                <p>{result.tactic}</p>
              </div>
              <div className="candidates">
                <div className="section-label">TOP CHOICES</div>
                {result.probabilities.map((p) => (
                  <div key={p.label}>
                    <span>{p.label}</span>
                    <i>
                      <b
                        style={{
                          width: `${Math.max(2, p.probability * 100)}%`,
                        }}
                      />
                    </i>
                    <small>{Math.round(p.probability * 100)}%</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="insight-empty">
              <Bot size={32} aria-hidden="true" />
              <strong>等待 Jev 决策</strong>
              <p>引擎先校验规则并完成谱库、子力、将帅安全和搜索评估。</p>
            </div>
          )}{" "}
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="primitive">
            <span>DECISION PIPELINE</span>
            <code>book → alpha-beta → choice()</code>
            <p>Jev 只能从服务端验证过的合法强候选中选择。</p>
          </div>
        </aside>
      </section>
      {showKeyPrompt && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="key-title"
          >
            <button
              className="modal-close"
              onClick={() => setShowKeyPrompt(false)}
              aria-label="关闭"
            >
              <X />
            </button>
            <span className="modal-icon">
              <KeyRound />
            </span>
            <small>BRING YOUR OWN KEY</small>
            <h2 id="key-title">配置 Jev API Key</h2>
            <p>密钥仅保存在当前浏览器本地，并经 HTTPS 发送给服务端代理。</p>
            <div className="key-field">
              <label htmlFor="key">TypeSafe API Key</label>
              <div>
                <input
                  id="key"
                  type={showKey ? "text" : "password"}
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  autoComplete="off"
                  aria-describedby={error ? "key-error" : undefined}
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? "隐藏密钥" : "显示密钥"}
                >
                  {showKey ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {error && <strong id="key-error" role="alert">{error}</strong>}
            </div>
            <button className="modal-cta key-submit" onClick={saveKey}>
              保存并开始
            </button>
            <a className="key-link" href="https://console.typesafe.ai/keys" target="_blank" rel="noreferrer">
              获取 TypeSafe API Key <ExternalLink size={14} aria-hidden="true" />
            </a>
          </section>
        </div>
      )}
    </main>
  );
}
