import { useState, useCallback, useEffect, useRef, useMemo } from "react";

// ─── Constants ───
const ROWS = 6, COLS = 7, EMPTY = 0, PLAYER = 1, AI = 2;
const DIFFICULTIES = {
  easy:       { name: "Easy",       depth: 1, mistake: 0.4 },
  normal:     { name: "Normal",     depth: 3, mistake: 0.15 },
  hard:       { name: "Hard",       depth: 5, mistake: 0 },
  impossible: { name: "Impossible", depth: 7, mistake: 0 },
};

// ─── Game Logic ───
const mkBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
const clone = b => b.map(r => [...r]);
const validMove = (b, c) => c >= 0 && c < COLS && b[0][c] === EMPTY;
const validCols = b => Array.from({ length: COLS }, (_, i) => i).filter(c => validMove(b, c));

function drop(b, c, p) {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][c] === EMPTY) { b[r][c] = p; return r; }
  return -1;
}
function wins(b, p) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r][c+i] === p)) return true;
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS; c++)
      if ([0,1,2,3].every(i => b[r+i][c] === p)) return true;
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r+i][c+i] === p)) return true;
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r-i][c+i] === p)) return true;
  return false;
}
function winCells(b, p) {
  const s = new Set();
  const add = arr => arr.forEach(([r,c]) => s.add(`${r}-${c}`));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r][c+i] === p)) add([0,1,2,3].map(i => [r,c+i]));
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS; c++)
      if ([0,1,2,3].every(i => b[r+i][c] === p)) add([0,1,2,3].map(i => [r+i,c]));
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r+i][c+i] === p)) add([0,1,2,3].map(i => [r+i,c+i]));
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r-i][c+i] === p)) add([0,1,2,3].map(i => [r-i,c+i]));
  return [...s];
}
const full = b => b[0].every(c => c !== EMPTY);
const terminal = b => wins(b, PLAYER) || wins(b, AI) || full(b);

function evalWin(w) {
  let s = 0;
  const a = w.filter(x => x === AI).length, e = w.filter(x => x === EMPTY).length, p = w.filter(x => x === PLAYER).length;
  if (a === 4) s += 100; else if (a === 3 && e === 1) s += 5; else if (a === 2 && e === 2) s += 2;
  if (p === 3 && e === 1) s -= 4;
  return s;
}
function scoreBoard(b) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) s += b[r][3] === AI ? 3 : 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS-3; c++) s += evalWin([0,1,2,3].map(i => b[r][c+i]));
  for (let r = 0; r < ROWS-3; r++) for (let c = 0; c < COLS; c++) s += evalWin([0,1,2,3].map(i => b[r+i][c]));
  for (let r = 0; r < ROWS-3; r++) for (let c = 0; c < COLS-3; c++) s += evalWin([0,1,2,3].map(i => b[r+i][c+i]));
  for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS-3; c++) s += evalWin([0,1,2,3].map(i => b[r-i][c+i]));
  return s;
}

function describeHeuristic(b) {
  const details = [];
  const center = Array.from({length: ROWS}, (_,r) => b[r][3]).filter(x => x === AI).length;
  if (center > 0) details.push({ label: "Center column bonus", value: `+${center * 3}` });
  let threes = 0, twos = 0, blocks = 0;
  const allW = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS-3; c++) allW.push([0,1,2,3].map(i => b[r][c+i]));
  for (let r = 0; r < ROWS-3; r++) for (let c = 0; c < COLS; c++) allW.push([0,1,2,3].map(i => b[r+i][c]));
  for (let r = 0; r < ROWS-3; r++) for (let c = 0; c < COLS-3; c++) allW.push([0,1,2,3].map(i => b[r+i][c+i]));
  for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS-3; c++) allW.push([0,1,2,3].map(i => b[r-i][c+i]));
  for (const w of allW) {
    const a = w.filter(x => x === AI).length, e = w.filter(x => x === EMPTY).length, p = w.filter(x => x === PLAYER).length;
    if (a === 3 && e === 1) threes++;
    if (a === 2 && e === 2) twos++;
    if (p === 3 && e === 1) blocks++;
  }
  if (threes) details.push({ label: "3-in-a-row with gap", value: `${threes} (+${threes*5})` });
  if (twos) details.push({ label: "2-in-a-row with gaps", value: `${twos} (+${twos*2})` });
  if (blocks) details.push({ label: "Threats to block", value: `${blocks} (-${blocks*4})` });
  return details;
}

// ─── Minimax with trace ───
const fmtAB = v => v === Infinity ? "+\u221E" : v === -Infinity ? "-\u221E" : v >= 100000 ? "+100k(W)" : v <= -100000 ? "-100k(L)" : String(v);
const fmtS = v => v >= 100000 ? "+100k (WIN)" : v <= -100000 ? "-100k (LOSE)" : String(v);

function minimax(b, depth, alpha, beta, max, node, trace, maxD) {
  const vc = validCols(b);
  const lvl = maxD - depth;
  const who = max ? "MAX(AI)" : "MIN(You)";
  const pad = "  ".repeat(lvl + 1);

  if (depth === 0 || terminal(b)) {
    let sc, reason;
    if (wins(b, AI)) { sc = 100000; reason = "AI wins!"; }
    else if (wins(b, PLAYER)) { sc = -100000; reason = "Player wins!"; }
    else if (full(b)) { sc = 0; reason = "Draw"; }
    else { sc = scoreBoard(b); reason = `Heuristic=${sc}`; }
    node.score = sc; node.reason = reason; node.leaf = true;
    trace.push({ lvl, type: "leaf", text: `${pad}[D${lvl}] ${reason} \u2192 ${fmtS(sc)}` });
    return [null, sc];
  }

  node.children = [];
  trace.push({ lvl, type: "explore", text: `${pad}[D${lvl}] ${who} cols=${JSON.stringify(vc)} \u03B1=${fmtAB(alpha)} \u03B2=${fmtAB(beta)}` });

  if (max) {
    let best = -Infinity, bestC = vc[0];
    for (const col of vc) {
      const t = clone(b); drop(t, col, AI);
      const ch = { col, who: "AI", pruned: false, children: [] };
      node.children.push(ch);
      trace.push({ lvl, type: "try", text: `${pad} \u2192 Try Col ${col} (AI)` });
      const [, sc] = minimax(t, depth-1, alpha, beta, false, ch, trace, maxD);
      ch.score = sc;
      trace.push({ lvl, type: "return", text: `${pad} \u2190 Col ${col} = ${fmtS(sc)}` });
      if (sc > best) {
        const old = best; best = sc; bestC = col;
        trace.push({ lvl, type: "update", text: `${pad}   \u2605 New best: col ${col} (${fmtS(sc)}${old > -Infinity ? ` > ${fmtS(old)}` : ""})` });
      }
      const oldA = alpha; alpha = Math.max(alpha, best);
      if (alpha !== oldA) trace.push({ lvl, type: "alpha", text: `${pad}   \u03B1 updated: ${fmtAB(oldA)} \u2192 ${fmtAB(alpha)}` });
      if (alpha >= beta) {
        const pruned = vc.filter(x => x > col);
        trace.push({ lvl, type: "prune", text: `${pad}   \u2702 PRUNE! \u03B1(${fmtAB(alpha)}) \u2265 \u03B2(${fmtAB(beta)})${pruned.length ? ` skip ${JSON.stringify(pruned)}` : ""}` });
        pruned.forEach(rc => node.children.push({ col: rc, who: "AI", pruned: true, score: null, children: [] }));
        break;
      }
    }
    node.score = best; node.bestCol = bestC;
    trace.push({ lvl, type: "result", text: `${pad}[D${lvl}] ${who} \u2192 col ${bestC}, score ${fmtS(best)}` });
    return [bestC, best];
  } else {
    let best = Infinity, bestC = vc[0];
    for (const col of vc) {
      const t = clone(b); drop(t, col, PLAYER);
      const ch = { col, who: "You", pruned: false, children: [] };
      node.children.push(ch);
      trace.push({ lvl, type: "try", text: `${pad} \u2192 Try Col ${col} (You)` });
      const [, sc] = minimax(t, depth-1, alpha, beta, true, ch, trace, maxD);
      ch.score = sc;
      trace.push({ lvl, type: "return", text: `${pad} \u2190 Col ${col} = ${fmtS(sc)}` });
      if (sc < best) {
        const old = best; best = sc; bestC = col;
        trace.push({ lvl, type: "update", text: `${pad}   \u2605 New best: col ${col} (${fmtS(sc)}${old < Infinity ? ` < ${fmtS(old)}` : ""})` });
      }
      const oldB = beta; beta = Math.min(beta, best);
      if (beta !== oldB) trace.push({ lvl, type: "beta", text: `${pad}   \u03B2 updated: ${fmtAB(oldB)} \u2192 ${fmtAB(beta)}` });
      if (alpha >= beta) {
        const pruned = vc.filter(x => x > col);
        trace.push({ lvl, type: "prune", text: `${pad}   \u2702 PRUNE! \u03B1(${fmtAB(alpha)}) \u2265 \u03B2(${fmtAB(beta)})${pruned.length ? ` skip ${JSON.stringify(pruned)}` : ""}` });
        pruned.forEach(rc => node.children.push({ col: rc, who: "You", pruned: true, score: null, children: [] }));
        break;
      }
    }
    node.score = best; node.bestCol = bestC;
    trace.push({ lvl, type: "result", text: `${pad}[D${lvl}] ${who} \u2192 col ${bestC}, score ${fmtS(best)}` });
    return [bestC, best];
  }
}

function countNodes(n) {
  let t = 1, p = n.pruned ? 1 : 0;
  for (const c of (n.children || [])) { const [tt, pp] = countNodes(c); t += tt; p += pp; }
  return [t, p];
}

function runAI(board, diff) {
  const { depth, mistake } = DIFFICULTIES[diff];
  const tree = { col: null, who: "ROOT", children: [], pruned: false };
  const trace = [];
  const t0 = performance.now();
  const [bestCol, score] = minimax(board, depth, -Infinity, Infinity, true, tree, trace, depth);
  const elapsed = ((performance.now() - t0) / 1000).toFixed(3);
  const [totalN, prunedN] = countNodes(tree);

  let chosenCol = bestCol, mistake_made = false;
  const vc = validCols(board);
  if (mistake > 0 && Math.random() < mistake && vc.length > 1) {
    const other = vc.filter(c => c !== bestCol);
    if (other.length) { chosenCol = other[Math.floor(Math.random() * other.length)]; mistake_made = true; }
  }

  const tb = clone(board); drop(tb, chosenCol, AI);
  const heuristic = describeHeuristic(tb);

  const colScores = (tree.children || []).map(ch => ({
    col: ch.col, score: ch.score, pruned: ch.pruned, best: ch.col === bestCol
  }));

  return { chosenCol, bestCol, score, trace, tree, colScores, heuristic, totalN, prunedN, elapsed, mistake_made, diff };
}

// ─── Tree Component ───
function TreeNode({ node, depth = 0, maxD = 2 }) {
  if (!node || depth > maxD) return null;
  const isRoot = node.who === "ROOT";
  const isAI = node.who === "AI";
  const pruned = node.pruned;
  const sc = node.score;

  const bg = pruned ? "#1e1e2e" : isRoot ? "#2d3250" : isAI ? "#3b2f0a" : "#3b0a0a";
  const border = sc != null ? (sc >= 100000 ? "#22c55e" : sc <= -100000 ? "#ef4444" : "transparent") : "transparent";
  const scoreColor = pruned ? "#555" : sc >= 100000 ? "#4ade80" : sc <= -100000 ? "#f87171" : "#fbbf24";
  const label = isRoot ? "AI" : `C${node.col}`;
  const scoreText = sc == null ? "" : sc >= 100000 ? " W" : sc <= -100000 ? " L" : ` ${sc}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <div style={{
        padding: "2px 7px", borderRadius: 5, background: bg, fontSize: 10,
        border: `1.5px solid ${border}`, color: pruned ? "#555" : "#cbd5e1",
        opacity: pruned ? 0.45 : 1, textDecoration: pruned ? "line-through" : "none",
        whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono', monospace",
        display: "flex", alignItems: "center", gap: 3,
      }}>
        <span>{label}</span>
        {scoreText && <span style={{ color: scoreColor, fontWeight: 700 }}>{scoreText}</span>}
        {pruned && <span style={{ fontSize: 8 }}>{"\u2702"}</span>}
      </div>
      {node.children?.length > 0 && depth < maxD && (
        <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
          {node.children.map((ch, i) => <TreeNode key={i} node={ch} depth={depth + 1} maxD={maxD} />)}
        </div>
      )}
    </div>
  );
}

// ─── Trace line color ───
function traceColor(type) {
  switch(type) {
    case "prune": return "#f97316";
    case "update": case "result": return "#fbbf24";
    case "alpha": return "#38bdf8";
    case "beta": return "#c084fc";
    case "leaf": return "#6ee7b7";
    default: return "#94a3b8";
  }
}

// ─── Colors ───
const C = {
  bg: "#0b0f1a", board: "#162044", boardEdge: "#0e1738",
  empty: "#0b0f1a", player: "#ef4444", playerG: "#f87171",
  ai: "#eab308", aiG: "#facc15", win: "#22c55e", winG: "#4ade80",
  text: "#e2e8f0", dim: "#64748b", panel: "#0f1629", panelBd: "#1e293b",
  accent: "#3b82f6",
};

// ─── Main Component ───
export default function ConnectFour() {
  const [phase, setPhase] = useState("menu"); // menu | playing | gameover
  const [diff, setDiff] = useState("normal");
  const [firstTurn, setFirstTurn] = useState("player"); // player | ai | random
  const [board, setBoard] = useState(mkBoard);
  const [turn, setTurn] = useState(PLAYER);
  const [status, setStatus] = useState("");
  const [hover, setHover] = useState(-1);
  const [wCells, setWCells] = useState([]);
  const [lastDrop, setLastDrop] = useState(null);
  const [scores, setScores] = useState({ p: 0, a: 0, d: 0 });
  const [aiResult, setAiResult] = useState(null);
  const [traceMode, setTraceMode] = useState("key"); // key | full
  const [treeDepth, setTreeDepth] = useState(2);
  const [panelTab, setPanelTab] = useState("summary");
  const [moveNum, setMoveNum] = useState(0);
  const aiRef = useRef(false);
  const traceRef = useRef(null);

  const startGame = useCallback(() => {
    const b = mkBoard();
    let t = PLAYER;
    if (firstTurn === "ai") t = AI;
    else if (firstTurn === "random") t = Math.random() < 0.5 ? PLAYER : AI;
    setBoard(b); setTurn(t); setStatus(t === PLAYER ? "your_turn" : "ai_thinking");
    setHover(-1); setWCells([]); setLastDrop(null); setAiResult(null);
    setMoveNum(0); setPhase("playing"); aiRef.current = false;
  }, [firstTurn]);

  const resetToMenu = useCallback(() => {
    setPhase("menu"); setAiResult(null); aiRef.current = false;
  }, []);

  const handleClick = useCallback(col => {
    if (status !== "your_turn" || !validMove(board, col)) return;
    const nb = clone(board); const row = drop(nb, col, PLAYER);
    setBoard(nb); setLastDrop(`${row}-${col}`); setMoveNum(m => m + 1);
    if (wins(nb, PLAYER)) {
      setWCells(winCells(nb, PLAYER)); setStatus("player_wins"); setPhase("gameover");
      setScores(s => ({ ...s, p: s.p + 1 }));
    } else if (full(nb)) {
      setStatus("draw"); setPhase("gameover"); setScores(s => ({ ...s, d: s.d + 1 }));
    } else { setTurn(AI); setStatus("ai_thinking"); }
  }, [board, status]);

  useEffect(() => {
    if (status !== "ai_thinking" || aiRef.current) return;
    aiRef.current = true;
    const timer = setTimeout(() => {
      const result = runAI(board, diff);
      setAiResult(result);
      const nb = clone(board); const row = drop(nb, result.chosenCol, AI);
      setBoard(nb); setLastDrop(`${row}-${result.chosenCol}`); setMoveNum(m => m + 1);
      if (wins(nb, AI)) {
        setWCells(winCells(nb, AI)); setStatus("ai_wins"); setPhase("gameover");
        setScores(s => ({ ...s, a: s.a + 1 }));
      } else if (full(nb)) {
        setStatus("draw"); setPhase("gameover"); setScores(s => ({ ...s, d: s.d + 1 }));
      } else { setTurn(PLAYER); setStatus("your_turn"); }
      aiRef.current = false;
    }, 350);
    return () => clearTimeout(timer);
  }, [status, board, diff]);

  useEffect(() => {
    if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight;
  }, [aiResult, panelTab]);

  const previewRow = col => {
    if (status !== "your_turn" || col < 0) return -1;
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === EMPTY) return r;
    return -1;
  };

  const filteredTrace = useMemo(() => {
    if (!aiResult) return [];
    if (traceMode === "full") return aiResult.trace;
    return aiResult.trace.filter(t => ["explore","prune","update","result","alpha","beta","leaf"].includes(t.type) && t.lvl <= 1);
  }, [aiResult, traceMode]);

  const gameOver = phase === "gameover";
  const statusText = { your_turn: "Your turn", ai_thinking: "AI thinking\u2026", player_wins: "You win!", ai_wins: "AI wins!", draw: "Draw!" }[status] || "";

  // ── MENU ──
  if (phase === "menu") return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', monospace",
      color: C.text, padding: 20,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');`}</style>
      <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 3, marginBottom: 8, color: C.ai }}>CONNECT FOUR</div>
      <div style={{ fontSize: 13, color: C.dim, marginBottom: 32 }}>Human vs AI \u2014 Minimax with Alpha-Beta Pruning</div>

      <div style={{ width: 320, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Difficulty</div>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(DIFFICULTIES).map(([k, v]) => (
            <button key={k} onClick={() => setDiff(k)} style={{
              flex: 1, padding: "8px 4px", fontSize: 11, fontWeight: diff === k ? 700 : 400,
              fontFamily: "inherit", background: diff === k ? "#1e293b" : "transparent",
              border: `1px solid ${diff === k ? C.accent : C.panelBd}`,
              color: diff === k ? C.text : C.dim, borderRadius: 6, cursor: "pointer",
            }}>{v.name}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>
          Depth: {DIFFICULTIES[diff].depth} | Mistakes: {(DIFFICULTIES[diff].mistake * 100).toFixed(0)}%
        </div>
      </div>

      <div style={{ width: 320, marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Who goes first</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["player","You"],["ai","AI"],["random","Random"]].map(([k,l]) => (
            <button key={k} onClick={() => setFirstTurn(k)} style={{
              flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: firstTurn === k ? 700 : 400,
              fontFamily: "inherit", background: firstTurn === k ? "#1e293b" : "transparent",
              border: `1px solid ${firstTurn === k ? C.accent : C.panelBd}`,
              color: firstTurn === k ? C.text : C.dim, borderRadius: 6, cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <button onClick={startGame} style={{
        padding: "12px 40px", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
        background: C.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
        letterSpacing: 2, textTransform: "uppercase",
      }}>Start Game</button>
    </div>
  );

  // ── GAME ──
  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono', monospace",
      color: C.text, padding: "12px 8px", boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes dropIn { 0%{transform:translateY(-280px);opacity:.6} 60%{transform:translateY(6px)} 80%{transform:translateY(-3px)} 100%{transform:translateY(0);opacity:1} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 8px 2px} 50%{box-shadow:0 0 18px 5px} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:.6} }
        .ch:hover{transform:scale(1.06)}
        .trace-line{animation:fadeIn .2s ease-out}
        @keyframes fadeIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>CONNECT FOUR</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 11, color: C.dim, margin: "4px 0" }}>
          <span><span style={{ color: C.player, fontWeight: 700 }}>You</span> {scores.p}</span>
          <span>Draw {scores.d}</span>
          <span><span style={{ color: C.ai, fontWeight: 700 }}>AI</span> {scores.a}</span>
          <span style={{ color: C.accent }}>{DIFFICULTIES[diff].name}</span>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, marginBottom: 6,
          color: status === "player_wins" ? C.win : status === "ai_wins" ? C.ai : C.text,
          animation: status === "ai_thinking" ? "shimmer 1s infinite" : "none",
        }}>{statusText}{moveNum > 0 ? ` \u2022 Move #${moveNum}` : ""}</div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Board */}
        <div style={{
          background: `linear-gradient(180deg, ${C.board}, ${C.boardEdge})`,
          borderRadius: 12, padding: 8, boxShadow: "0 6px 24px rgba(0,0,0,.5)",
        }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
            {Array.from({ length: COLS }, (_, c) => (
              <div key={c} style={{
                width: "clamp(30px,8vw,48px)", height: 5, borderRadius: "3px 3px 0 0",
                background: hover === c && status === "your_turn" ? C.player : "transparent",
                transition: "background .15s",
              }} />
            ))}
          </div>
          {board.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {row.map((cell, c) => {
                const isW = wCells.includes(`${r}-${c}`);
                const isL = lastDrop === `${r}-${c}`;
                const isPrev = hover === c && previewRow(c) === r && status === "your_turn";
                const sz = "clamp(30px,8vw,48px)";
                let bg = C.empty, sh = "inset 0 2px 5px rgba(0,0,0,.5)";
                if (cell === PLAYER) { bg = `radial-gradient(circle at 35% 35%,${C.playerG},${C.player})`; sh = `inset 0 -2px 3px rgba(0,0,0,.3),0 0 6px ${C.player}44`; }
                else if (cell === AI) { bg = `radial-gradient(circle at 35% 35%,${C.aiG},${C.ai})`; sh = `inset 0 -2px 3px rgba(0,0,0,.3),0 0 6px ${C.ai}44`; }
                else if (isPrev) { bg = `${C.player}25`; sh = "inset 0 2px 4px rgba(0,0,0,.3)"; }
                return (
                  <div key={c} className={cell === EMPTY && status === "your_turn" ? "ch" : ""}
                    onClick={() => handleClick(c)}
                    onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(-1)}
                    style={{
                      width: sz, height: sz, borderRadius: "50%", background: bg,
                      boxShadow: isW ? `0 0 10px 3px ${C.winG}` : sh,
                      cursor: status === "your_turn" && validMove(board, c) ? "pointer" : "default",
                      transition: "transform .15s,box-shadow .2s",
                      animation: isL && cell ? "dropIn .4s cubic-bezier(.34,1.56,.64,1)" : isW ? "pulse 1s infinite" : "none",
                      border: isW ? `2px solid ${C.win}` : "2px solid transparent",
                    }} />
                );
              })}
            </div>
          ))}
        </div>

        {/* AI Panel */}
        <div style={{
          width: "clamp(280px,40vw,420px)", background: C.panel, border: `1px solid ${C.panelBd}`,
          borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "80vh",
        }}>
          {/* Panel tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.panelBd}`, background: "#0a0f1f" }}>
            {[["summary","\u{1F4CB} Summary"],["trace","\u{1F50D} Trace"],["tree","\u{1F333} Tree"],["stats","\u{1F4CA} Stats"]].map(([k,l]) => (
              <button key={k} onClick={() => setPanelTab(k)} style={{
                flex: 1, padding: "8px 4px", fontSize: 10, fontWeight: panelTab === k ? 700 : 400,
                fontFamily: "inherit", background: panelTab === k ? C.panel : "transparent",
                border: "none", borderBottom: panelTab === k ? `2px solid ${C.accent}` : "2px solid transparent",
                color: panelTab === k ? C.text : C.dim, cursor: "pointer",
              }}>{l}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {!aiResult ? (
              <div style={{ color: C.dim, fontSize: 11, fontStyle: "italic", padding: 20, textAlign: "center" }}>
                AI thought process will appear here after the first AI move
              </div>
            ) : panelTab === "summary" ? (
              /* ── SUMMARY TAB ── */
              <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                <div style={{ color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontSize: 10 }}>Decision Summary</div>
                <div style={{ color: C.dim }}>Difficulty: <span style={{ color: C.text }}>{DIFFICULTIES[aiResult.diff].name}</span> (depth={DIFFICULTIES[aiResult.diff].depth})</div>
                <div style={{ marginTop: 10, marginBottom: 4, color: C.dim }}>Column Scores:</div>
                {aiResult.colScores.map(cs => (
                  <div key={cs.col} style={{
                    display: "flex", justifyContent: "space-between", padding: "2px 8px",
                    background: cs.best ? "#1e3a5f" : "transparent", borderRadius: 4,
                    color: cs.pruned ? "#555" : cs.best ? C.ai : C.text,
                    fontWeight: cs.best ? 700 : 400,
                    textDecoration: cs.pruned ? "line-through" : "none",
                  }}>
                    <span>Col {cs.col}</span>
                    <span>{cs.pruned ? "PRUNED" : cs.score >= 100000 ? "WIN" : cs.score <= -100000 ? "LOSE" : cs.score}{cs.best ? " \u2190 BEST" : ""}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: "8px 10px", background: "#0c1425", borderRadius: 6, borderLeft: `3px solid ${aiResult.mistake_made ? "#f97316" : C.win}` }}>
                  {aiResult.mistake_made ? (
                    <><span style={{ color: "#f97316" }}>{"\u26A0"} MISTAKE!</span> AI chose col {aiResult.chosenCol} instead of optimal col {aiResult.bestCol}</>
                  ) : (
                    <><span style={{ color: C.win }}>{"\u2705"}</span> Play column {aiResult.chosenCol} (score: {aiResult.score >= 100000 ? "WIN" : aiResult.score <= -100000 ? "LOSE" : aiResult.score})</>
                  )}
                </div>
                {/* Heuristic breakdown */}
                {aiResult.heuristic.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontSize: 10 }}>Board Evaluation Breakdown</div>
                    {aiResult.heuristic.map((h, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 8px", color: C.text }}>
                        <span style={{ color: C.dim }}>{h.label}</span>
                        <span style={{ color: "#6ee7b7" }}>{h.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : panelTab === "trace" ? (
              /* ── TRACE TAB ── */
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: C.dim, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Minimax Trace</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["key","Key"],["full","Full"]].map(([k,l]) => (
                      <button key={k} onClick={() => setTraceMode(k)} style={{
                        padding: "2px 8px", fontSize: 9, fontFamily: "inherit",
                        background: traceMode === k ? "#1e293b" : "transparent",
                        border: `1px solid ${C.panelBd}`, color: traceMode === k ? C.text : C.dim,
                        borderRadius: 4, cursor: "pointer",
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div ref={traceRef} style={{ maxHeight: 400, overflowY: "auto", fontSize: 10, lineHeight: 1.6 }}>
                  {filteredTrace.map((t, i) => (
                    <div key={i} className="trace-line" style={{
                      color: traceColor(t.type), padding: "1px 0",
                      fontWeight: t.type === "prune" || t.type === "result" ? 600 : 400,
                      whiteSpace: "pre-wrap", wordBreak: "break-all",
                    }}>{t.text}</div>
                  ))}
                  {filteredTrace.length === 0 && <div style={{ color: C.dim, fontStyle: "italic" }}>No trace data</div>}
                </div>
                {/* mini legend */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.panelBd}` }}>
                  {[
                    ["\u03B1","Alpha (AI best)","#38bdf8"],
                    ["\u03B2","Beta (Your best)","#c084fc"],
                    ["\u2702","Pruned","#f97316"],
                    ["\u2605","New best","#fbbf24"],
                  ].map(([sym, label, color]) => (
                    <span key={sym} style={{ fontSize: 9, color: C.dim }}><span style={{ color }}>{sym}</span> {label}</span>
                  ))}
                </div>
              </div>
            ) : panelTab === "tree" ? (
              /* ── TREE TAB ── */
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: C.dim, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Decision Tree</span>
                  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <span style={{ color: C.dim, fontSize: 9 }}>Depth:</span>
                    {[1, 2, 3].map(d => (
                      <button key={d} onClick={() => setTreeDepth(d)} style={{
                        padding: "1px 6px", fontSize: 9, fontFamily: "inherit",
                        background: treeDepth === d ? "#1e293b" : "transparent",
                        border: `1px solid ${C.panelBd}`, color: treeDepth === d ? C.text : C.dim,
                        borderRadius: 3, cursor: "pointer",
                      }}>{d}</button>
                    ))}
                  </div>
                </div>
                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 350, paddingBottom: 4 }}>
                  <TreeNode node={aiResult.tree} maxD={treeDepth} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.panelBd}` }}>
                  {[
                    ["#3b2f0a","AI (max)"], ["#3b0a0a","You (min)"],
                    ["#1e1e2e","Pruned"], ["#22c55e","W=Win"], ["#ef4444","L=Lose"],
                  ].map(([bg, label]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: C.dim }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: bg }} />{label}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── STATS TAB ── */
              <div style={{ fontSize: 11, lineHeight: 2 }}>
                <div style={{ color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontSize: 10 }}>Statistics</div>
                {[
                  ["Nodes explored", aiResult.totalN - aiResult.prunedN],
                  ["Nodes pruned", `${aiResult.prunedN} (${(aiResult.prunedN / aiResult.totalN * 100).toFixed(1)}%)`],
                  ["Total tree size", aiResult.totalN],
                  ["Search depth", DIFFICULTIES[aiResult.diff].depth],
                  ["Time", `${aiResult.elapsed}s`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 8px" }}>
                    <span style={{ color: C.dim }}>{k}</span>
                    <span style={{ color: C.text, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}

                <div style={{ marginTop: 16, padding: "10px 12px", background: "#0c1425", borderRadius: 6 }}>
                  <div style={{ color: C.dim, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>How to Read This</div>
                  {[
                    ["MAX(AI)", "AI\u2019s turn \u2014 picks highest score"],
                    ["MIN(You)", "Your turn \u2014 AI assumes you pick lowest"],
                    ["\u03B1 Alpha", "Best score AI can guarantee"],
                    ["\u03B2 Beta", "Best score you can guarantee"],
                    ["\u2702 Prune", "\u03B1 \u2265 \u03B2, branch is useless \u2014 skip it"],
                    ["WIN +100k", "Guaranteed winning path found"],
                    ["LOSE -100k", "Guaranteed loss if opponent plays well"],
                    ["Heuristic", "Estimated score at depth limit"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ fontSize: 10, lineHeight: 1.6, padding: "1px 0" }}>
                      <span style={{ color: C.accent, fontWeight: 600 }}>{k}:</span>{" "}
                      <span style={{ color: C.dim }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
        {gameOver && (
          <button onClick={startGame} style={{
            padding: "8px 24px", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
            background: C.text, color: C.bg, border: "none", borderRadius: 6,
            cursor: "pointer", letterSpacing: 2, textTransform: "uppercase",
          }}>New Game</button>
        )}
        <button onClick={resetToMenu} style={{
          padding: "8px 24px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
          background: "transparent", color: C.dim, border: `1px solid ${C.panelBd}`,
          borderRadius: 6, cursor: "pointer", letterSpacing: 1,
        }}>Menu</button>
      </div>
    </div>
  );
}
