import React from 'react';

export default function MiniTree({ node, depth = 0, maxDepth = 2 }) {
  if (!node || depth > maxDepth) return null;

  const hasChildren = node.children && node.children.length > 0;
  const isRoot = node.who === "ROOT";
  const isAI = node.who === "AI";
  const isPruned = node.pruned;

  let bgColor = isRoot ? "#334155" : isAI ? "#854d0e" : "#7f1d1d";
  if (isPruned) bgColor = "#374151";

  let borderColor = "transparent";
  if (!isRoot && node.score !== null && node.score !== undefined) {
    borderColor = node.score >= 100000 ? "#22c55e" : node.score <= -100000 ? "#ef4444" : "transparent";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{
        padding: "3px 8px",
        borderRadius: 6,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        fontSize: 11,
        color: isPruned ? "#6b7280" : "#e2e8f0",
        opacity: isPruned ? 0.5 : 1,
        textDecoration: isPruned ? "line-through" : "none",
        whiteSpace: "nowrap",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {isRoot ? "AI ROOT" : `C${node.col}`}
        {node.score !== null && node.score !== undefined && (
          <span style={{
            marginLeft: 4,
            fontWeight: 700,
            color: isPruned ? "#6b7280" : node.score >= 100000 ? "#4ade80" : node.score <= -100000 ? "#f87171" : "#facc15",
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