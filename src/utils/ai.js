import { DEPTH, AI, PLAYER, EMPTY } from '../constants';
import { cloneBoard, dropPiece, checkWinner, isBoardFull, getValidCols, scoreBoard } from './gameLogic';

function evaluateWindow(w) {
  let s = 0;
  const aiCount = w.filter(c => c === AI).length;
  const plCount = w.filter(c => c === PLAYER).length;
  const emCount = w.filter(c => c === EMPTY).length;

  if (aiCount === 4) s += 100;
  else if (aiCount === 3 && emCount === 1) s += 5;
  else if (aiCount === 2 && emCount === 2) s += 2;

  if (plCount === 3 && emCount === 1) s -= 4;

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

export function aiMoveLogged(board) {
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