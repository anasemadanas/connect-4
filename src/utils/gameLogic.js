import { ROWS, COLS, EMPTY, PLAYER, AI } from '../constants';

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

export function cloneBoard(b) {
  return b.map((r) => [...r]);
}

export function isValidMove(b, c) {
  return c >= 0 && c < COLS && b[0][c] === EMPTY;
}

export function getValidCols(b) {
  return Array.from({ length: COLS }, (_, i) => i).filter((c) => isValidMove(b, c));
}

export function dropPiece(b, c, p) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r][c] === EMPTY) {
      b[r][c] = p;
      return r;
    }
  }
  return -1;
}

export function checkWinner(b, p) {
  // Horizontal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r][c+i] === p)) return true;

  // Vertical
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS; c++)
      if ([0,1,2,3].every(i => b[r+i][c] === p)) return true;

  // Diagonal \
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r+i][c+i] === p)) return true;

  // Diagonal /
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r-i][c+i] === p)) return true;

  return false;
}

export function getWinningCells(b, p) {
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

  // Diagonal \
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r+i][c+i] === p))
        [0,1,2,3].forEach(i => cells.push(`${r+i}-${c+i}`));

  // Diagonal /
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if ([0,1,2,3].every(i => b[r-i][c+i] === p))
        [0,1,2,3].forEach(i => cells.push(`${r-i}-${c+i}`));

  return [...new Set(cells)];
}

export function isBoardFull(b) {
  return b[0].every(c => c !== EMPTY);
}