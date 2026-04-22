import { useState, useCallback, useEffect, useRef } from "react";

// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
const ROWS = 6, COLS = 7, EMPTY = 0, PLAYER = 1, AI = 2;
const DIFF = {
  easy:       { name: "Easy",       depth: 2, mistake: 0.35 },
  normal:     { name: "Normal",     depth: 4, mistake: 0.10 },
  hard:       { name: "Hard",       depth: 6, mistake: 0 },
  impossible: { name: "Impossible", depth: 8, mistake: 0 },
};

// ═══════════════════════════════════════════
//  GAME LOGIC (pure)
// ═══════════════════════════════════════════
const mkB = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
const cp = b => b.map(r => [...r]);
const ok = (b, c) => c >= 0 && c < COLS && b[0][c] === EMPTY;
const cols = b => Array.from({ length: COLS }, (_, i) => i).filter(c => ok(b, c));
const full = b => b[0].every(x => x !== EMPTY);

function drop(b, c, p) {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][c] === EMPTY) { b[r][c] = p; return r; }
  return -1;
}

function wins(b, p) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if (b[r][c] === p && b[r][c+1] === p && b[r][c+2] === p && b[r][c+3] === p) return true;
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c < COLS; c++)
      if (b[r][c] === p && b[r+1][c] === p && b[r+2][c] === p && b[r+3][c] === p) return true;
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if (b[r][c] === p && b[r+1][c+1] === p && b[r+2][c+2] === p && b[r+3][c+3] === p) return true;
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if (b[r][c] === p && b[r-1][c+1] === p && b[r-2][c+2] === p && b[r-3][c+3] === p) return true;
  return false;
}

function getWC(b, p) {
  const s = new Set();
  const a = arr => arr.forEach(([r,c]) => s.add(`${r}-${c}`));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS-4; c++)
    if ([0,1,2,3].every(i => b[r][c+i] === p)) a([0,1,2,3].map(i => [r,c+i]));
  for (let r = 0; r <= ROWS-4; r++) for (let c = 0; c < COLS; c++)
    if ([0,1,2,3].every(i => b[r+i][c] === p)) a([0,1,2,3].map(i => [r+i,c]));
  for (let r = 0; r <= ROWS-4; r++) for (let c = 0; c <= COLS-4; c++)
    if ([0,1,2,3].every(i => b[r+i][c+i] === p)) a([0,1,2,3].map(i => [r+i,c+i]));
  for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS-4; c++)
    if ([0,1,2,3].every(i => b[r-i][c+i] === p)) a([0,1,2,3].map(i => [r-i,c+i]));
  return [...s];
}

// ═══════════════════════════════════════════
//  HEURISTIC
// ═══════════════════════════════════════════
function evalW(w) {
  let s = 0;
  const ai = w.filter(x => x === AI).length, e = w.filter(x => x === EMPTY).length, p = w.filter(x => x === PLAYER).length;
  if (ai === 4) s += 100; else if (ai === 3 && e === 1) s += 5; else if (ai === 2 && e === 2) s += 2;
  if (p === 3 && e === 1) s -= 4;
  return s;
}

function scoreB(b) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) s += b[r][3] === AI ? 3 : 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS-4; c++) s += evalW([0,1,2,3].map(i => b[r][c+i]));
  for (let r = 0; r <= ROWS-4; r++) for (let c = 0; c < COLS; c++) s += evalW([0,1,2,3].map(i => b[r+i][c]));
  for (let r = 0; r <= ROWS-4; r++) for (let c = 0; c <= COLS-4; c++) s += evalW([0,1,2,3].map(i => b[r+i][c+i]));
  for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS-4; c++) s += evalW([0,1,2,3].map(i => b[r-i][c+i]));
  return s;
}

// ═══════════════════════════════════════════
//  MINIMAX + ALPHA-BETA + TRACE
// ═══════════════════════════════════════════
function minimax(b, depth, alpha, beta, isMax, node, evts, maxD) {
  const vc = cols(b);

  if (depth === 0 || wins(b, AI) || wins(b, PLAYER) || full(b)) {
    let sc;
    if (wins(b, AI)) sc = 100000 + depth;
    else if (wins(b, PLAYER)) sc = -100000 - depth;
    else if (full(b)) sc = 0;
    else sc = scoreB(b);
    node.score = sc; node.leaf = true;
    return [null, sc];
  }

  node.children = [];

  if (isMax) {
    let best = -Infinity, bestC = vc[0];
    for (const col of vc) {
      const t = cp(b); drop(t, col, AI);
      const ch = { col, who: "AI", pruned: false, children: [] };
      node.children.push(ch);
      const [, sc] = minimax(t, depth - 1, alpha, beta, false, ch, evts, maxD);
      ch.score = sc;
      if (sc > best) { best = sc; bestC = col; }
      alpha = Math.max(alpha, best);
      if (alpha >= beta) {
        const sk = vc.filter(x => x > col);
        if (sk.length) evts.push({ lvl: maxD - depth, who: "AI", col, alpha, beta, skipped: sk });
        sk.forEach(rc => node.children.push({ col: rc, who: "AI", pruned: true, score: null, children: [] }));
        break;
      }
    }
    node.score = best; node.bestCol = bestC;
    return [bestC, best];
  } else {
    let best = Infinity, bestC = vc[0];
    for (const col of vc) {
      const t = cp(b); drop(t, col, PLAYER);
      const ch = { col, who: "You", pruned: false, children: [] };
      node.children.push(ch);
      const [, sc] = minimax(t, depth - 1, alpha, beta, true, ch, evts, maxD);
      ch.score = sc;
      if (sc < best) { best = sc; bestC = col; }
      beta = Math.min(beta, best);
      if (alpha >= beta) {
        const sk = vc.filter(x => x > col);
        if (sk.length) evts.push({ lvl: maxD - depth, who: "You", col, alpha, beta, skipped: sk });
        sk.forEach(rc => node.children.push({ col: rc, who: "You", pruned: true, score: null, children: [] }));
        break;
      }
    }
    node.score = best; node.bestCol = bestC;
    return [bestC, best];
  }
}

function cntN(n) { let t = 1, p = n.pruned ? 1 : 0; for (const c of (n.children || [])) { const [tt, pp] = cntN(c); t += tt; p += pp; } return [t, p]; }

function runAI(board, diffKey) {
  const { depth, mistake } = DIFF[diffKey];
  const tree = { col: null, who: "ROOT", children: [], pruned: false };
  const evts = [];
  const t0 = performance.now();
  const [bestCol, score] = minimax(board, depth, -Infinity, Infinity, true, tree, evts, depth);
  const ms = performance.now() - t0;
  const [totalN, prunedN] = cntN(tree);

  let chosen = bestCol, oops = false;
  const vc = cols(board);
  if (mistake > 0 && Math.random() < mistake && vc.length > 1) {
    const o = vc.filter(c => c !== bestCol);
    if (o.length) { chosen = o[Math.floor(Math.random() * o.length)]; oops = true; }
  }

  const colScores = (tree.children || []).map(ch => ({ col: ch.col, score: ch.score, pruned: ch.pruned, best: ch.col === bestCol }));
  return { chosen, bestCol, score, tree, colScores, evts, totalN, prunedN, ms, oops, diffKey };
}

// ═══════════════════════════════════════════
//  VISUAL COMPONENTS
// ═══════════════════════════════════════════
const fS = v => v == null ? "?" : v >= 100000 ? "WIN" : v <= -100000 ? "LOSE" : String(v);

function TreeViz({ node, d = 0, max = 2 }) {
  if (!node || d > max) return null;
  const root = node.who === "ROOT", pr = node.pruned, sc = node.score, isAI = node.who === "AI";
  const bg = pr ? "#111" : root ? "#1e293b" : isAI ? "#422006" : "#450a0a";
  const bd = sc != null ? (sc >= 100000 ? "#22c55e" : sc <= -100000 ? "#ef4444" : "#252f3f") : "#1a1f2e";
  const scC = pr ? "#444" : sc >= 100000 ? "#4ade80" : sc <= -100000 ? "#f87171" : "#fbbf24";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{
        padding: "2px 7px", borderRadius: 5, background: bg, border: `1.5px solid ${bd}`,
        fontSize: 10, color: pr ? "#444" : "#cbd5e1", opacity: pr ? .4 : 1,
        textDecoration: pr ? "line-through" : "none", whiteSpace: "nowrap",
        fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3,
      }}>
        <span>{root ? "AI" : `C${node.col}`}</span>
        {sc != null && <span style={{ color: scC, fontWeight: 700 }}>{fS(sc)}</span>}
        {pr && <span style={{ fontSize: 8 }}>{"\u2702"}</span>}
      </div>
      {node.children?.length > 0 && d < max && (
        <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
          {node.children.map((ch, i) => <TreeViz key={i} node={ch} d={d + 1} max={max} />)}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score, best, pruned, col }) {
  if (pruned) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <div style={{ width: 34, fontSize: 11, color: "#444", fontWeight: 600, fontFamily: "inherit" }}>Col {col}</div>
      <div style={{ flex: 1, height: 20, background: "#0d1117", borderRadius: 5, display: "flex", alignItems: "center", padding: "0 8px", border: "1px solid #1a1f2e" }}>
        <span style={{ fontSize: 10, color: "#444", textDecoration: "line-through" }}>{"\u2702"} PRUNED</span>
      </div>
    </div>
  );
  const isW = score >= 100000, isL = score <= -100000;
  const display = isW ? "WIN" : isL ? "LOSE" : score;
  const mx = 50;
  const cl = isW ? mx : isL ? -mx : Math.max(-mx, Math.min(mx, score));
  const pct = ((cl + mx) / (2 * mx)) * 100;
  const barC = isW ? "#22c55e" : isL ? "#ef4444" : score > 0 ? "#eab308" : score < 0 ? "#f97316" : "#475569";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <div style={{ width: 34, fontSize: 11, color: best ? "#fbbf24" : "#8896ab", fontWeight: best ? 700 : 500, fontFamily: "inherit" }}>Col {col}</div>
      <div style={{ flex: 1, height: 20, background: "#0d1117", borderRadius: 5, position: "relative", overflow: "hidden", border: best ? "1.5px solid #fbbf24" : "1px solid #1a1f2e" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#252f3f" }} />
        <div style={{
          position: "absolute", top: 2, bottom: 2, borderRadius: 3,
          left: score >= 0 ? "50%" : `${pct}%`,
          width: `${Math.abs(pct - 50)}%`,
          background: barC, transition: "all .3s ease",
        }} />
        <div style={{
          position: "absolute", right: 8, top: 0, bottom: 0, display: "flex", alignItems: "center",
          fontSize: 10, fontWeight: 700, color: best ? "#fbbf24" : "#e2e8f0",
        }}>{display}{best ? " \u25C0" : ""}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  COLORS
// ═══════════════════════════════════════════
const K = {
  bg: "#050810", board: "#12203e", boardE: "#0a1530", empty: "#070b16",
  pl: "#ef4444", plG: "#f87171", ai: "#eab308", aiG: "#facc15",
  win: "#22c55e", winG: "#4ade80", txt: "#e2e8f0", dim: "#64748b",
  pan: "#0a0f1e", panBd: "#172033", acc: "#3b82f6",
};

// ═══════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════
export default function ConnectFour() {
  const [phase, setPhase] = useState("menu");
  const [diff, setDiff] = useState("normal");
  const [first, setFirst] = useState("player");
  const [board, setBoard] = useState(mkB);
  const [status, setStatus] = useState("");
  const [hover, setHover] = useState(-1);
  const [wc, setWc] = useState([]);
  const [ld, setLd] = useState(null);
  const [sc, setSc] = useState({ p: 0, a: 0, d: 0 });
  const [ai, setAi] = useState(null);
  const [td, setTd] = useState(2);
  const [mn, setMn] = useState(0);
  const ref = useRef(false);

  const go = useCallback(() => {
    let t = PLAYER;
    if (first === "ai") t = AI;
    else if (first === "random") t = Math.random() < .5 ? PLAYER : AI;
    setBoard(mkB()); setStatus(t === PLAYER ? "turn" : "think");
    setHover(-1); setWc([]); setLd(null); setAi(null);
    setMn(0); setPhase("play"); ref.current = false;
  }, [first]);

  const click = useCallback(c => {
    if (status !== "turn" || !ok(board, c)) return;
    const nb = cp(board); const r = drop(nb, c, PLAYER);
    setBoard(nb); setLd(`${r}-${c}`); setMn(m => m + 1);
    if (wins(nb, PLAYER)) { setWc(getWC(nb, PLAYER)); setStatus("pw"); setPhase("over"); setSc(s => ({ ...s, p: s.p + 1 })); }
    else if (full(nb)) { setStatus("dr"); setPhase("over"); setSc(s => ({ ...s, d: s.d + 1 })); }
    else setStatus("think");
  }, [board, status]);

  useEffect(() => {
    if (status !== "think" || ref.current) return;
    ref.current = true;
    const t = setTimeout(() => {
      const res = runAI(board, diff);
      setAi(res);
      const nb = cp(board); const r = drop(nb, res.chosen, AI);
      setBoard(nb); setLd(`${r}-${res.chosen}`); setMn(m => m + 1);
      if (wins(nb, AI)) { setWc(getWC(nb, AI)); setStatus("aw"); setPhase("over"); setSc(s => ({ ...s, a: s.a + 1 })); }
      else if (full(nb)) { setStatus("dr"); setPhase("over"); setSc(s => ({ ...s, d: s.d + 1 })); }
      else setStatus("turn");
      ref.current = false;
    }, 300);
    return () => clearTimeout(t);
  }, [status, board, diff]);

  const pvR = c => {
    if (status !== "turn" || c < 0) return -1;
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][c] === EMPTY) return r;
    return -1;
  };

  const over = phase === "over";
  const stTxt = { turn: "Your turn", think: "AI thinking\u2026", pw: "You win!", aw: "AI wins!", dr: "Draw!" }[status] || "";

  // ══════ MENU ══════
  if (phase === "menu") return (
    <div style={{ minHeight: "100vh", background: K.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace", color: K.txt, padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');`}</style>
      <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: 5, marginBottom: 6, color: K.ai }}>CONNECT 4</div>
      <div style={{ fontSize: 12, color: K.dim, marginBottom: 40 }}>Minimax \u00B7 Alpha-Beta Pruning \u00B7 AI</div>

      <div style={{ width: 360, marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: K.dim, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Difficulty</div>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(DIFF).map(([k, v]) => (
            <button key={k} onClick={() => setDiff(k)} style={{
              flex: 1, padding: "10px 2px", fontSize: 11, fontWeight: diff === k ? 700 : 400,
              fontFamily: "inherit", background: diff === k ? "#1e293b" : "transparent",
              border: `1px solid ${diff === k ? K.acc : K.panBd}`,
              color: diff === k ? K.txt : K.dim, borderRadius: 6, cursor: "pointer",
            }}>{v.name}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: K.dim, marginTop: 8, textAlign: "center" }}>
          Depth {DIFF[diff].depth}{DIFF[diff].mistake ? ` \u00B7 ${(DIFF[diff].mistake*100)|0}% mistakes` : " \u00B7 Perfect play"}
        </div>
      </div>

      <div style={{ width: 360, marginBottom: 40 }}>
        <div style={{ fontSize: 10, color: K.dim, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>First Move</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["player","You"],["ai","AI"],["random","Random"]].map(([k,l]) => (
            <button key={k} onClick={() => setFirst(k)} style={{
              flex: 1, padding: "10px 4px", fontSize: 12, fontWeight: first === k ? 700 : 400,
              fontFamily: "inherit", background: first === k ? "#1e293b" : "transparent",
              border: `1px solid ${first === k ? K.acc : K.panBd}`,
              color: first === k ? K.txt : K.dim, borderRadius: 6, cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <button onClick={go} style={{
        padding: "14px 52px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
        background: K.acc, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
        letterSpacing: 3, textTransform: "uppercase",
      }}>Play</button>
    </div>
  );

  // ══════ GAME ══════
  return (
    <div style={{ minHeight: "100vh", background: K.bg, fontFamily: "'IBM Plex Mono',monospace", color: K.txt, padding: "10px 6px", boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes di{0%{transform:translateY(-260px);opacity:.4}60%{transform:translateY(5px)}80%{transform:translateY(-2px)}100%{transform:translateY(0);opacity:1}}
        @keyframes pu{0%,100%{box-shadow:0 0 8px 2px}50%{box-shadow:0 0 16px 5px}}
        @keyframes sh{0%,100%{opacity:1}50%{opacity:.45}}
        .hv:hover{transform:scale(1.08)}
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>CONNECT 4</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11, color: K.dim, margin: "3px 0" }}>
          <span><span style={{ color: K.pl, fontWeight: 700 }}>You</span> {sc.p}</span>
          <span>Draw {sc.d}</span>
          <span><span style={{ color: K.ai, fontWeight: 700 }}>AI</span> {sc.a}</span>
          <span style={{ color: K.acc }}>{DIFF[diff].name}</span>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: status === "pw" ? K.win : status === "aw" ? K.ai : K.txt,
          animation: status === "think" ? "sh 1s infinite" : "none",
        }}>{stTxt}</div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ── Board ── */}
        <div style={{ background: `linear-gradient(180deg,${K.board},${K.boardE})`, borderRadius: 12, padding: 8, boxShadow: "0 6px 28px rgba(0,0,0,.6)" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
            {Array.from({ length: COLS }, (_, c) => (
              <div key={c} style={{ width: "clamp(30px,8vw,48px)", height: 5, borderRadius: "3px 3px 0 0", background: hover === c && status === "turn" ? K.pl : "transparent", transition: "background .15s" }} />
            ))}
          </div>
          {board.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {row.map((cell, c) => {
                const isW = wc.includes(`${r}-${c}`), isL = ld === `${r}-${c}`;
                const isP = hover === c && pvR(c) === r && status === "turn";
                const sz = "clamp(30px,8vw,48px)";
                let bg = K.empty, sh = "inset 0 2px 5px rgba(0,0,0,.5)";
                if (cell === PLAYER) { bg = `radial-gradient(circle at 35% 35%,${K.plG},${K.pl})`; sh = `inset 0 -2px 3px rgba(0,0,0,.3),0 0 6px ${K.pl}44`; }
                else if (cell === AI) { bg = `radial-gradient(circle at 35% 35%,${K.aiG},${K.ai})`; sh = `inset 0 -2px 3px rgba(0,0,0,.3),0 0 6px ${K.ai}44`; }
                else if (isP) { bg = `${K.pl}22`; sh = "inset 0 2px 4px rgba(0,0,0,.3)"; }
                return (
                  <div key={c} className={cell === EMPTY && status === "turn" ? "hv" : ""}
                    onClick={() => click(c)} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(-1)}
                    style={{
                      width: sz, height: sz, borderRadius: "50%", background: bg,
                      boxShadow: isW ? `0 0 10px 3px ${K.winG}` : sh,
                      cursor: status === "turn" && ok(board, c) ? "pointer" : "default",
                      transition: "transform .15s,box-shadow .2s",
                      animation: isL && cell ? "di .4s cubic-bezier(.34,1.56,.64,1)" : isW ? "pu 1s infinite" : "none",
                      border: isW ? `2px solid ${K.win}` : "2px solid transparent",
                    }} />
                );
              })}
            </div>
          ))}
        </div>

        {/* ── AI Panel ── */}
        <div style={{ width: "clamp(280px,40vw,400px)", background: K.pan, border: `1px solid ${K.panBd}`, borderRadius: 10, overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${K.panBd}`, background: "#06091a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>{"\u{1F9E0}"} AI Thought Process</span>
            {ai && <span style={{ fontSize: 10, color: K.dim }}>{(ai.ms / 1000).toFixed(3)}s</span>}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {!ai ? (
              <div style={{ color: K.dim, fontSize: 11, fontStyle: "italic", padding: 30, textAlign: "center" }}>
                Play a move to see the AI think
              </div>
            ) : (
              <>
                {/* Score Bars */}
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${K.panBd}` }}>
                  <div style={{ fontSize: 10, color: K.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Column Evaluation</div>
                  {ai.colScores.map(cs => <ScoreBar key={cs.col} col={cs.col} score={cs.score} best={cs.best} pruned={cs.pruned} />)}
                  <div style={{
                    marginTop: 8, padding: "7px 10px", borderRadius: 6, fontSize: 11,
                    background: ai.oops ? "#451a03" : "#052e16",
                    borderLeft: `3px solid ${ai.oops ? "#f97316" : "#22c55e"}`,
                  }}>
                    {ai.oops
                      ? <>{"\u26A0\uFE0F"} <span style={{ color: "#fb923c" }}>Mistake!</span> Col {ai.chosen} instead of {ai.bestCol}</>
                      : <>{"\u2705"} Column {ai.chosen} ({fS(ai.score)})</>
                    }
                  </div>
                </div>

                {/* Prune Events */}
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${K.panBd}` }}>
                  <div style={{ fontSize: 10, color: K.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{"\u2702\uFE0F"} Prune Events ({ai.evts.length})</div>
                  <div style={{ maxHeight: 110, overflowY: "auto" }}>
                    {ai.evts.length === 0
                      ? <div style={{ fontSize: 10, color: K.dim, fontStyle: "italic" }}>None</div>
                      : ai.evts.slice(0, 25).map((e, i) => (
                        <div key={i} style={{ fontSize: 10, color: "#fb923c", padding: "1px 0", display: "flex", gap: 5 }}>
                          <span style={{ flexShrink: 0, color: "#f97316" }}>{"\u2702"}</span>
                          <span>D{e.lvl} {e.who} @col{e.col}: \u03B1={e.alpha >= 100000 ? "W" : e.alpha <= -100000 ? "L" : e.alpha === -Infinity ? "-\u221E" : e.alpha} \u2265 \u03B2={e.beta <= -100000 ? "L" : e.beta >= 100000 ? "W" : e.beta === Infinity ? "+\u221E" : e.beta} \u2192 skip [{e.skipped.join(",")}]</span>
                        </div>
                      ))
                    }
                    {ai.evts.length > 25 && <div style={{ fontSize: 9, color: K.dim }}>+{ai.evts.length - 25} more</div>}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${K.panBd}` }}>
                  <div style={{ fontSize: 10, color: K.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{"\u{1F4CA}"} Stats</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", fontSize: 11 }}>
                    <span style={{ color: K.dim }}>Explored</span><span style={{ fontWeight: 600, textAlign: "right" }}>{(ai.totalN - ai.prunedN).toLocaleString()}</span>
                    <span style={{ color: K.dim }}>Pruned</span><span style={{ fontWeight: 600, textAlign: "right", color: "#f97316" }}>{ai.prunedN.toLocaleString()} ({(ai.prunedN / ai.totalN * 100).toFixed(0)}%)</span>
                    <span style={{ color: K.dim }}>Total</span><span style={{ fontWeight: 600, textAlign: "right" }}>{ai.totalN.toLocaleString()}</span>
                    <span style={{ color: K.dim }}>Depth</span><span style={{ fontWeight: 600, textAlign: "right" }}>{DIFF[ai.diffKey].depth}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, color: K.dim, marginBottom: 3 }}>Explored vs Pruned</div>
                    <div style={{ height: 10, background: "#111827", borderRadius: 5, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${((ai.totalN - ai.prunedN) / ai.totalN * 100)}%`, background: K.acc, borderRadius: "5px 0 0 5px", transition: "width .5s" }} />
                      <div style={{ flex: 1, background: "#f97316" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: K.dim, marginTop: 2 }}>
                      <span>{"\u{1F7E6}"} Explored</span><span>{"\u{1F7E7}"} Pruned</span>
                    </div>
                  </div>
                </div>

                {/* Tree */}
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: K.dim, textTransform: "uppercase", letterSpacing: 1 }}>{"\u{1F333}"} Decision Tree</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[1, 2, 3].map(d => (
                        <button key={d} onClick={() => setTd(d)} style={{
                          padding: "2px 7px", fontSize: 9, fontFamily: "inherit",
                          background: td === d ? "#1e293b" : "transparent",
                          border: `1px solid ${K.panBd}`, color: td === d ? K.txt : K.dim,
                          borderRadius: 4, cursor: "pointer",
                        }}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 200, paddingBottom: 4 }}>
                    <TreeViz node={ai.tree} max={td} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, paddingTop: 6, borderTop: `1px solid ${K.panBd}` }}>
                    {[["#422006","AI (max)"],["#450a0a","You (min)"],["#111","\u2702 Pruned"],["#22c55e","W"],["#ef4444","L"]].map(([bg,l]) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: K.dim }}>
                        <div style={{ width: 9, height: 9, borderRadius: 2, background: bg }} />{l}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
        {over && <button onClick={go} style={{ padding: "8px 24px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: K.txt, color: K.bg, border: "none", borderRadius: 6, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase" }}>New Game</button>}
        <button onClick={() => { setPhase("menu"); setAi(null); ref.current = false; }} style={{ padding: "8px 24px", fontSize: 11, fontFamily: "inherit", background: "transparent", color: K.dim, border: `1px solid ${K.panBd}`, borderRadius: 6, cursor: "pointer" }}>Menu</button>
      </div>
    </div>
  );
}
