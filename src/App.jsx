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
    if (status !== "your_turn" || !board[0][col] === 0) return; // simplified check

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

  // AI Move Effect
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
        @keyframes dropIn { 0% { transform: translateY(-300px); opacity: 0.7; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 8px 2px; } 50% { box-shadow: 0 0 20px 6px; } }
        .cell-hover:hover { transform: scale(1.08); }
        .log-step { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <h1 style={{ color: COLORS.text, fontSize: "clamp(18px, 4vw, 28px)", fontWeight: 700, margin: "0 0 4px", letterSpacing: "3px", textTransform: "uppercase" }}>
        CONNECT FOUR
      </h1>

      <div style={{ display: "flex", gap: "20px", marginBottom: "8px", fontSize: "12px", color: COLORS.textDim }}>
        <span><span style={{ color: COLORS.player, fontWeight: 700 }}>You</span> {scores.player}</span>
        <span>Draws {scores.draws}</span>
        <span><span style={{ color: COLORS.ai, fontWeight: 700 }}>AI</span> {scores.ai}</span>
      </div>

      <div style={{
        color: status === "player_wins" ? COLORS.win : status === "ai_wins" ? COLORS.ai : COLORS.text,
        fontSize: "14px", marginBottom: "10px", fontWeight: 700,
        animation: status === "ai_thinking" ? "shimmer 1.2s infinite" : "none",
      }}>
        {statusText}
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 920 }}>

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
        </div>
      </div>

      {gameOver && (
        <button onClick={resetGame} style={{
          marginTop: "16px", padding: "10px 28px", fontSize: "13px", fontWeight: 700,
          color: COLORS.bg, background: COLORS.text, border: "none",
          borderRadius: "8px", cursor: "pointer", letterSpacing: "2px", textTransform: "uppercase",
        }}>
          NEW GAME
        </button>
      )}
    </div>
  );
}