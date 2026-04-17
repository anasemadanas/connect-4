import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createBoard, checkWinner, getWinningCells, isBoardFull, cloneBoard, dropPiece } from './utils/gameLogic';
import { aiMoveLogged } from './utils/ai';
import Board from './components/Board';
import MiniTree from './components/MiniTree';
import { COLORS } from './constants';

export default function App() {
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
    if (status !== "your_turn" || !dropPiece(cloneBoard(board), col, 1)) return;

    const nb = cloneBoard(board);
    const row = dropPiece(nb, col, 1); // PLAYER = 1
    setBoard(nb);
    setLastDrop(`${row}-${col}`);

    if (checkWinner(nb, 1)) {
      setWinCells(getWinningCells(nb, 1));
      setStatus("player_wins");
      setScores(s => ({ ...s, player: s.player + 1 }));
    } else if (isBoardFull(nb)) {
      setStatus("draw");
      setScores(s => ({ ...s, draws: s.draws + 1 }));
    } else {
      setStatus("ai_thinking");
    }
  }, [board, status]);

  // AI Thinking Effect
  useEffect(() => {
    if (status !== "ai_thinking" || aiThinking.current) return;

    aiThinking.current = true;

    const timer = setTimeout(() => {
      const { col, steps, tree } = aiMoveLogged(board);

      setAiLog(steps);
      setAiTree(tree);

      const nb = cloneBoard(board);
      const row = dropPiece(nb, col, 2); // AI = 2
      setBoard(nb);
      setLastDrop(`${row}-${col}`);

      if (checkWinner(nb, 2)) {
        setWinCells(getWinningCells(nb, 2));
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0a0e27 0%, #0f1535 50%, #0a0e27 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'JetBrains Mono', monospace",
      padding: "16px",
      boxSizing: "border-box",
      userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes dropIn {
          0% { transform: translateY(-300px); opacity: 0.7; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 8px 2px; } 50% { box-shadow: 0 0 20px 6px; } }
        @keyframes shimmer { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
        .cell-hover:hover { transform: scale(1.08); }
        .log-step { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <h1 style={{ 
        color: COLORS.text, 
        fontSize: "clamp(18px, 4vw, 28px)", 
        fontWeight: 700, 
        margin: "0 0 4px", 
        letterSpacing: "3px", 
        textTransform: "uppercase" 
      }}>
        CONNECT FOUR
      </h1>

      <div style={{ display: "flex", gap: "20px", marginBottom: "8px", fontSize: "12px", color: COLORS.textDim }}>
        <span><span style={{ color: COLORS.player, fontWeight: 700 }}>You</span> {scores.player}</span>
        <span>Draws {scores.draws}</span>
        <span><span style={{ color: COLORS.ai, fontWeight: 700 }}>AI</span> {scores.ai}</span>
      </div>

      <div style={{
        color: status === "player_wins" ? COLORS.win : status === "ai_wins" ? COLORS.ai : COLORS.text,
        fontSize: "14px",
        marginBottom: "10px",
        fontWeight: 700,
        animation: status === "ai_thinking" ? "shimmer 1.2s infinite" : "none",
      }}>
        {statusText}
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 920 }}>

        {/* Game Board */}
        <Board 
          board={board}
          status={status}
          hoverCol={hoverCol}
          winCells={winCells}
          lastDrop={lastDrop}
          onClick={handleClick}
          setHoverCol={setHoverCol}
        />

        {/* AI Reasoning Panel */}
        <div style={{
          width: "clamp(260px, 35vw, 380px)",
          background: COLORS.panelBg,
          border: `1px solid ${COLORS.panelBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: `1px solid ${COLORS.panelBorder}`, background: "#0f172a",
          }}>
            <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>🧠 AI Reasoning</span>
            <button 
              onClick={() => setShowPanel(p => !p)} 
              style={{
                background: "none",
                border: `1px solid ${COLORS.panelBorder}`,
                color: COLORS.textDim,
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
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.panelBorder}` }}>
                <div style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
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
                    <div style={{ color: COLORS.textDim, fontStyle: "italic", fontSize: 11 }}>
                      Make your move • AI reasoning will appear here
                    </div>
                  ) : aiLog.map((step, i) => (
                    <div key={i} className="log-step" style={{
                      color: step.icon === "⭐" || step.icon === "✅" ? "#facc15" : 
                             step.icon === "✂️" ? "#f97316" : COLORS.text,
                      padding: "2px 0",
                      fontWeight: step.icon === "✅" ? 700 : 400,
                    }}>
                      <span style={{ marginRight: 6 }}>{step.icon}</span>
                      {step.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Tree */}
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: COLORS.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                    Decision Tree
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ color: COLORS.textDim, fontSize: 10 }}>Depth:</span>
                    {[1, 2, 3].map(d => (
                      <button 
                        key={d} 
                        onClick={() => setTreeDepth(d)} 
                        style={{
                          background: treeDepth === d ? "#334155" : "transparent",
                          border: `1px solid ${COLORS.panelBorder}`,
                          color: treeDepth === d ? COLORS.text : COLORS.textDim,
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

                <div style={{ overflowX: "auto", maxHeight: 220, paddingBottom: 6 }}>
                  {aiTree ? (
                    <MiniTree node={aiTree} depth={0} maxDepth={treeDepth} />
                  ) : (
                    <div style={{ color: COLORS.textDim, fontStyle: "italic", fontSize: 11 }}>
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
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: COLORS.textDim }}>
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
            color: COLORS.bg,
            background: COLORS.text,
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