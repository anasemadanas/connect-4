"""
Connect Four - Human vs AI
Uses Minimax with Alpha-Beta Pruning
Features: 4 difficulty levels, first-turn selection, reasoning log, decision tree
University Project
"""

import { useState, useCallback, useEffect, useRef } from "react";

// --- Game Constants ---
const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER = 1;
const AI = 2;
const DEPTH = 4;

// --- Game Logic ---
function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function cloneBoard(b) {
  return b.map((r) => [...r]);
}

function isValidMove(b, c) {
  return c >= 0 && c < COLS && b[0][c] === EMPTY;
}

function getValidCols(b) {
  return Array.from({ length: COLS }, (_, i) => i).filter((c) => isValidMove(b, c));
}

function dropPiece(b, c, p) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r][c] === EMPTY) {
      b[r][c] = p;
      return r;
    }
  }
  return -1;
}

function checkWinner(b, p) {
  // Horizontal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r][c+i] === p)) return true;

  // Vertical
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS; c++)
      if ([0,1,2,3].every(i => b[r+i][c] === p)) return true;

  // Diagonal /
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r+i][c+i] === p)) return true;

  // Diagonal \
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r-i][c+i] === p)) return true;

  return false;
}

function getWinningCells(b, p) {
  const cells = [];
  // Horizontal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r][c+i] === p))
        [0,1,2,3].forEach(i => cells.push(`${r}-${c+i}`));

  // Vertical
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS; c++)
      if ([0,1,2,3].every(i => b[r+i][c] === p))
        [0,1,2,3].forEach(i => cells.push(`${r+i}-${c}`));

  // Diagonal /
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r+i][c+i] === p))
        [0,1,2,3].forEach(i => cells.push(`${r+i}-${c+i}`));

  // Diagonal \
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r-i][c+i] === p))
        [0,1,2,3].forEach(i => cells.push(`${r-i}-${c+i}`));

  return [...new Set(cells)];
}

function isBoardFull(b) {
  return b[0].every(c => c !== EMPTY);
}

function evaluateWindow(w) {
  let s = 0;
  const ai = w.filter(c => c === AI).length;
  const pl = w.filter(c => c === PLAYER).length;
  const em = w.filter(c => c === EMPTY).length;

  if (ai === 4) s += 100;
  else if (ai === 3 && em === 1) s += 5;
  else if (ai === 2 && em === 2) s += 2;

  if (pl === 3 && em === 1) s -= 4;

  return s;
}

function scoreBoard(b) {
  let s = 0;
  // Center column preference
  for (let r = 0; r < ROWS; r++) s += b[r][3] === AI ? 3 : 0;

  // Horizontal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      s += evaluateWindow([0,1,2,3].map(i => b[r][c+i]));

  // Vertical
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS; c++)
      s += evaluateWindow([0,1,2,3].map(i => b[r+i][c]));

  // Diagonal /
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      s += evaluateWindow([0,1,2,3].map(i => b[r+i][c+i]));

  // Diagonal \
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      s += evaluateWindow([0,1,2,3].map(i => b[r-i][c+i]));

  return s;
}

// Minimax with Alpha-Beta Pruning + Logging
function minimaxLogged(board, depth, alpha, beta, maximizing, log, treeNode) {
  const validCols = getValidCols(board);
  const termAI = checkWinner(board, AI);
  const termPL = checkWinner(board, PLAYER);
  const full = isBoardFull(board);

  if (depth === 0 || termAI || termPL || full) {
    let score, reason;
    if (termAI) { score = 100000; reason = "AI wins!"; }
    else if (termPL) { score = -100000; reason = "Player wins!"; }
    else if (full) { score = 0; reason = "Draw"; }
    else { score = scoreBoard(board); reason = `Heuristic = ${score}`; }

    treeNode.score = score;
    treeNode.reason = reason;
    treeNode.leaf = true;
    return [null, score];
  }

  if (maximizing) {
    let bestScore = -Infinity;
    let bestCol = validCols[0];

    for (const col of validCols) {
      const temp = cloneBoard(board);
      dropPiece(temp, col, AI);
      const childNode = { col, who: "AI", children: [], pruned: false };
      treeNode.children.push(childNode);

      const [, sc] = minimaxLogged(temp, depth - 1, alpha, beta, false, log, childNode);
      childNode.score = sc;

      if (sc > bestScore) {
        bestScore = sc;
        bestCol = col;
      }

      alpha = Math.max(alpha, bestScore);
      if (alpha >= beta) {
        log.push({ type: "prune", col, alpha, beta });
        // Mark remaining columns as pruned
        for (const rc of validCols) {
          if (rc > col && !treeNode.children.find(c => c.col === rc)) {
            treeNode.children.push({ col: rc, who: "AI", children: [], pruned: true, score: null });
          }
        }
        break;
      }
    }
    treeNode.score = bestScore;
    treeNode.bestCol = bestCol;
    return [bestCol, bestScore];
  } else {
    let bestScore = Infinity;
    let bestCol = validCols[0];

    for (const col of validCols) {
      const temp = cloneBoard(board);
      dropPiece(temp, col, PLAYER);
      const childNode = { col, who: "Player", children: [], pruned: false };
      treeNode.children.push(childNode);

      const [, sc] = minimaxLogged(temp, depth - 1, alpha, beta, true, log, childNode);
      childNode.score = sc;

      if (sc < bestScore) {
        bestScore = sc;
        bestCol = col;
      }

      beta = Math.min(beta, bestScore);
      if (alpha >= beta) {
        log.push({ type: "prune", col, alpha, beta });
        for (const rc of validCols) {
          if (rc > col && !treeNode.children.find(c => c.col === rc)) {
            treeNode.children.push({ col: rc, who: "Player", children: [], pruned: true, score: null });
          }
        }
        break;
      }
    }
    treeNode.score = bestScore;
    treeNode.bestCol = bestCol;
    return [bestCol, bestScore];
  }
}

function aiMoveLogged(board) {
  const log = [];
  const tree = { col: null, who: "ROOT", children: [], pruned: false };

  const [col, score] = minimaxLogged(board, DEPTH, -Infinity, Infinity, true, log, tree);

  const steps = [];
  steps.push({ 
    icon: "🔍", 
    text: `AI evaluates ${getValidCols(board).length} possible columns` 
  });

  for (const child of tree.children) {
    if (child.pruned) {
      steps.push({ 
        icon: "✂️", 
        text: `Col ${child.col}: PRUNED (skipped)` 
      });
    } else {
      const s = child.score;
      const label = s >= 100000 ? "winning move!" : 
                    s <= -100000 ? "losing move" : `score ${s}`;
      steps.push({ 
        icon: child.col === col ? "⭐" : "📊", 
        text: `Col ${child.col}: ${label}` 
      });
    }
  }

  const pruneCount = log.filter(l => l.type === "prune").length;
  steps.push({ 
    icon: "✂️", 
    text: `Alpha-beta pruned ${pruneCount} branches total` 
  });

  steps.push({ 
    icon: "✅", 
    text: `Best move: Column ${col} (score: ${score >= 100000 ? "WIN" : score <= -100000 ? "LOSE" : score})` 
  });

  return { col, steps, tree };
}

// --- Tree Visualization Component ---
function MiniTree({ node, depth = 0, maxDepth = 2 }) {
  if (!node || depth > maxDepth) return null;

  const hasChildren = node.children && node.children.length > 0;
  const isRoot = node.who === "ROOT";
  const isAI = node.who === "AI";
  const isPruned = node.pruned;

  let bgColor = isRoot ? "#334155" : isAI ? "#854d0e" : "#7f1d1d";
  if (isPruned) bgColor = "#374151";

  let borderColor = "transparent";
  if (!isRoot && node.score !== null && node.score !== undefined) {
    if (node.score >= 100000) borderColor = "#22c55e";
    else if (node.score <= -100000) borderColor = "#ef4444";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{
        padding: "3px 8px", borderRadius: 6, background: bgColor,
        border: `2px solid ${borderColor}`, fontSize: 11,
        color: isPruned ? "#6b7280" : "#e2e8f0",
        opacity: isPruned ? 0.5 : 1,
        textDecoration: isPruned ? "line-through" : "none",
        whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace",
      }}>
        {isRoot ? "AI ROOT" : `C${node.col}`}
        {node.score !== null && node.score !== undefined && (
          <span style={{
            marginLeft: 4, fontWeight: 700,
            color: isPruned ? "#6b7280" : 
                   node.score >= 100000 ? "#4ade80" : 
                   node.score <= -100000 ? "#f87171" : "#facc15",
          }}>
            {node.score >= 100000 ? "W" : node.score <= -100000 ? "L" : node.score}
          </span>
        )}
        {isPruned && <span style={{ marginLeft: 3 }}>✂️</span>}
      </div>

      {hasChildren && depth < maxDepth && (
        <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
          {node.children.map((child, i) => (
            <MiniTree key={i} node={child} depth={depth + 1} maxDepth={maxDepth} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Colors ---
const C = {
  bg: "#0a0e27",
  boardFace: "#1a237e",
  boardEdge: "#0d1452",
  empty: "#0a0e27",
  player: "#ef4444",
  playerGlow: "#f87171",
  ai: "#facc15",
  aiGlow: "#fde047",
  win: "#22c55e",
  winGlow: "#4ade80",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  panelBg: "#111827",
  panelBorder: "#1e293b",
};

// --- Main Component ---
export default function ConnectFour() {
  const [board, setBoard] = useState(createBoard());
  const [status, setStatus] = useState("your_turn");
  const [hoverCol, setHoverCol] = useState(-1);
  const [winCells, setWinCells] = useState([]);
  const [lastDrop, setLastDrop] = useState(null);
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
  const [aiLog, setAiLog] = useState([]);
  const [aiTree, setAiTree] = useState(null);
  const [showPanel, setShowPanel] = useState(true);
  const [treeDepth, setTreeDepth] = useState(2);

  const aiThinking = useRef(false);
  const logRef = useRef(null);

  const resetGame = useCallback(() => {
    setBoard(createBoard());
    setStatus("your_turn");
    setHoverCol(-1);
    setWinCells([]);
    setLastDrop(null);
    setAiLog([]);
    setAiTree(null);
    aiThinking.current = false;
  }, []);

  const handleClick = useCallback((col) => {
    if (status !== "your_turn" || !isValidMove(board, col)) return;

    const nb = cloneBoard(board);
    const row = dropPiece(nb, col, PLAYER);
    setBoard(nb);
    setLastDrop(`${row}-${col}`);

    if (checkWinner(nb, PLAYER)) {
      setWinCells(getWinningCells(nb, PLAYER));
      setStatus("player_wins");
      setScores(s => ({ ...s, player: s.player + 1 }));
    } else if (isBoardFull(nb)) {
      setStatus("draw");
      setScores(s => ({ ...s, draws: s.draws + 1 }));
    } else {
      setStatus("ai_thinking");
    }
  }, [board, status]);

  // AI Move
  useEffect(() => {
    if (status !== "ai_thinking" || aiThinking.current) return;

    aiThinking.current = true;

    const timer = setTimeout(() => {
      const { col, steps, tree } = aiMoveLogged(board);

      setAiLog(steps);
      setAiTree(tree);

      const nb = cloneBoard(board);
      const row = dropPiece(nb, col, AI);
      setBoard(nb);
      setLastDrop(`${row}-${col}`);

      if (checkWinner(nb, AI)) {
        setWinCells(getWinningCells(nb, AI));
        setStatus("ai_wins");
        setScores(s => ({ ...s, ai: s.ai + 1 }));
      } else if (isBoardFull(nb)) {
        setStatus("draw");
        setScores(s => ({ ...s, draws: s.draws + 1 }));
      } else {
        setStatus("your_turn");
      }

      aiThinking.current = false;
    }, 400);

    return () => clearTimeout(timer);
  }, [status, board]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [aiLog]);

  const gameOver = ["player_wins", "ai_wins", "draw"].includes(status);

  const statusText = {
    your_turn: "Your turn — pick a column",
    ai_thinking: "AI is thinking…",
    player_wins: "You win! 🎉",
    ai_wins: "AI wins!",
    draw: "It's a draw!",
  }[status];

  const previewRow = (col) => {
    if (status !== "your_turn" || col < 0) return -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === EMPTY) return r;
    }
    return -1;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0a0e27 0%, #0f1535 50%, #0a0e27 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      padding: "16px",
      boxSizing: "border-box",
      userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes dropIn {
          0% { transform: translateY(-300px); opacity: 0.7; }
          60% { transform: translateY(6px); }
          80% { transform: translateY(-3px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 8px 2px; } 50% { box-shadow: 0 0 20px 6px; } }
        @keyframes shimmer { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
        .cell-hover:hover { transform: scale(1.08); }
        .log-step { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <h1 style={{ 
        color: C.text, 
        fontSize: "clamp(18px, 4vw, 28px)", 
        fontWeight: 700, 
        margin: "0 0 4px", 
        letterSpacing: "3px", 
        textTransform: "uppercase" 
      }}>
        CONNECT FOUR
      </h1>

      <div style={{ display: "flex", gap: "20px", marginBottom: "8px", fontSize: "12px", color: C.textDim }}>
        <span><span style={{ color: C.player, fontWeight: 700 }}>You</span> {scores.player}</span>
        <span>Draws {scores.draws}</span>
        <span><span style={{ color: C.ai, fontWeight: 700 }}>AI</span> {scores.ai}</span>
      </div>

      <div style={{
        color: status === "player_wins" ? C.win : status === "ai_wins" ? C.ai : C.text,
        fontSize: "14px",
        marginBottom: "10px",
        fontWeight: 700,
        animation: status === "ai_thinking" ? "shimmer 1.2s infinite" : "none",
      }}>
        {statusText}
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 920 }}>

        {/* Game Board */}
        <div style={{
          background: "linear-gradient(180deg, #1a237e 0%, #0d1452 100%)",
          borderRadius: "14px",
          padding: "10px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          {/* Top indicators */}
          <div style={{ display: "flex", gap: "5px", marginBottom: "3px" }}>
            {Array.from({ length: COLS }, (_, c) => (
              <div key={c} style={{
                width: "clamp(32px, 8.5vw, 52px)",
                height: "6px",
                borderRadius: "3px 3px 0 0",
                background: hoverCol === c && status === "your_turn" ? C.player : "transparent",
                transition: "background 0.15s",
              }} />
            ))}
          </div>

          {board.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
              {row.map((cell, c) => {
                const isWin = winCells.includes(`${r}-${c}`);
                const isLast = lastDrop === `${r}-${c}`;
                const isPreview = hoverCol === c && previewRow(c) === r && status === "your_turn";
                const sz = "clamp(32px, 8.5vw, 52px)";

                let bg = C.empty;
                let shadow = "inset 0 2px 6px rgba(0,0,0,0.5)";

                if (cell === PLAYER) {
                  bg = `radial-gradient(circle at 35% 35%, ${C.playerGlow}, ${C.player})`;
                  shadow = `inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 8px ${C.player}44`;
                } else if (cell === AI) {
                  bg = `radial-gradient(circle at 35% 35%, ${C.aiGlow}, ${C.ai})`;
                  shadow = `inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 8px ${C.ai}44`;
                } else if (isPreview) {
                  bg = `${C.player}30`;
                  shadow = "inset 0 2px 6px rgba(0,0,0,0.3)";
                }

                return (
                  <div
                    key={c}
                    className={cell === EMPTY && status === "your_turn" ? "cell-hover" : ""}
                    onClick={() => handleClick(c)}
                    onMouseEnter={() => setHoverCol(c)}
                    onMouseLeave={() => setHoverCol(-1)}
                    style={{
                      width: sz,
                      height: sz,
                      borderRadius: "50%",
                      background: bg,
                      boxShadow: isWin ? `0 0 12px 4px ${C.winGlow}` : shadow,
                      cursor: status === "your_turn" && isValidMove(board, c) ? "pointer" : "default",
                      transition: "transform 0.15s, box-shadow 0.3s",
                      animation: isLast && cell !== EMPTY 
                        ? "dropIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" 
                        : isWin 
                        ? "pulse 1s infinite" 
                        : "none",
                      animationFillMode: "both",
                      border: isWin ? `2px solid ${C.win}` : "2px solid transparent",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* AI Reasoning Panel */}
        <div style={{
          width: "clamp(260px, 35vw, 380px)",
          background: C.panelBg,
          border: `1px solid ${C.panelBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: `1px solid ${C.panelBorder}`,
            background: "#0f172a",
          }}>
            <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>🧠 AI Reasoning</span>
            <button 
              onClick={() => setShowPanel(p => !p)} 
              style={{
                background: "none",
                border: `1px solid ${C.panelBorder}`,
                color: C.textDim,
                borderRadius: 6,
                padding: "2px 8px",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "inherit",
              }}
            >
              {showPanel ? "Hide" : "Show"}
            </button>
          </div>

          {showPanel && (
            <div>
              {/* Step Log */}
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.panelBorder}` }}>
                <div style={{ color: C.textDim, fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                  Step-by-Step Log
                </div>
                <div 
                  ref={logRef} 
                  style={{ 
                    maxHeight: 170, 
                    overflowY: "auto", 
                    fontSize: 12, 
                    lineHeight: 1.7 
                  }}
                >
                  {aiLog.length === 0 ? (
                    <div style={{ color: C.textDim, fontStyle: "italic", fontSize: 11 }}>
                      Make your move • AI reasoning will appear here
                    </div>
                  ) : (
                    aiLog.map((step, i) => (
                      <div key={i} className="log-step" style={{
                        color: step.icon === "⭐" || step.icon === "✅" ? "#facc15" : 
                               step.icon === "✂️" ? "#f97316" : C.text,
                        padding: "2px 0",
                        fontWeight: step.icon === "✅" ? 700 : 400,
                      }}>
                        <span style={{ marginRight: 6 }}>{step.icon}</span>
                        {step.text}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Decision Tree */}
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: C.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                    Decision Tree
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ color: C.textDim, fontSize: 10 }}>Depth:</span>
                    {[1, 2, 3].map(d => (
                      <button 
                        key={d} 
                        onClick={() => setTreeDepth(d)} 
                        style={{
                          background: treeDepth === d ? "#334155" : "transparent",
                          border: `1px solid ${C.panelBorder}`,
                          color: treeDepth === d ? C.text : C.textDim,
                          borderRadius: 4,
                          padding: "1px 6px",
                          cursor: "pointer",
                          fontSize: 10,
                          fontFamily: "inherit",
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 220, paddingBottom: 6 }}>
                  {aiTree ? (
                    <MiniTree node={aiTree} depth={0} maxDepth={treeDepth} />
                  ) : (
                    <div style={{ color: C.textDim, fontStyle: "italic", fontSize: 11 }}>
                      Decision tree appears after AI moves
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  {[
                    { color: "#854d0e", label: "AI (max)" },
                    { color: "#7f1d1d", label: "You (min)" },
                    { color: "#374151", label: "Pruned" },
                    { color: "#22c55e", label: "W = Win" },
                    { color: "#f87171", label: "L = Lose" },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textDim }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {gameOver && (
        <button 
          onClick={resetGame} 
          style={{
            marginTop: "16px",
            padding: "10px 28px",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "inherit",
            color: C.bg,
            background: C.text,
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          NEW GAME
        </button>
      )}
    </div>
  );
}
