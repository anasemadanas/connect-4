import React from 'react';
import { COLORS } from '../constants';
import { isValidMove } from '../utils/gameLogic';

export default function Board({ 
  board, 
  status, 
  hoverCol, 
  winCells, 
  lastDrop, 
  onClick, 
  setHoverCol 
}) {

  const previewRow = (col) => {
    if (status !== "your_turn" || col < 0) return -1;
    for (let r = board.length - 1; r >= 0; r--) {
      if (board[r][col] === 0) return r;
    }
    return -1;
  };

  return (
    <div style={{
      background: "linear-gradient(180deg, #1a237e 0%, #0d1452 100%)",
      borderRadius: "14px",
      padding: "10px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {/* Top indicators */}
      <div style={{ display: "flex", gap: "5px", marginBottom: "3px" }}>
        {Array.from({ length: 7 }, (_, c) => (
          <div key={c} style={{
            width: "clamp(32px, 8.5vw, 52px)",
            height: "6px",
            borderRadius: "3px 3px 0 0",
            background: hoverCol === c && status === "your_turn" ? COLORS.player : "transparent",
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

            let bg = COLORS.empty;
            let shadow = "inset 0 2px 6px rgba(0,0,0,0.5)";

            if (cell === 1) { // PLAYER
              bg = `radial-gradient(circle at 35% 35%, ${COLORS.playerGlow}, ${COLORS.player})`;
              shadow = `inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 8px ${COLORS.player}44`;
            } else if (cell === 2) { // AI
              bg = `radial-gradient(circle at 35% 35%, ${COLORS.aiGlow}, ${COLORS.ai})`;
              shadow = `inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 8px ${COLORS.ai}44`;
            } else if (isPreview) {
              bg = `${COLORS.player}30`;
              shadow = "inset 0 2px 6px rgba(0,0,0,0.3)";
            }

            return (
              <div
                key={c}
                className={cell === 0 && status === "your_turn" ? "cell-hover" : ""}
                onClick={() => onClick(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(-1)}
                style={{
                  width: sz,
                  height: sz,
                  borderRadius: "50%",
                  background: bg,
                  boxShadow: isWin ? `0 0 12px 4px ${COLORS.winGlow}` : shadow,
                  cursor: status === "your_turn" && isValidMove(board, c) ? "pointer" : "default",
                  transition: "transform 0.15s, box-shadow 0.3s",
                  animation: isLast && cell !== 0 
                    ? "dropIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" 
                    : isWin 
                    ? "pulse 1s infinite" 
                    : "none",
                  animationFillMode: "both",
                  border: isWin ? `2px solid ${COLORS.win}` : "2px solid transparent",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}