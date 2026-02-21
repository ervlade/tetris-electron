// ============================================================
// TETRIS - Game Logic
// ============================================================

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// Piece definitions: each piece has rotations defined as [row, col] offsets
const PIECES = {
  I: {
    color: '#00f0f0',
    shadow: '#009999',
    shapes: [
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
    ],
  },
  O: {
    color: '#f0f000',
    shadow: '#999900',
    shapes: [
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
    ],
  },
  T: {
    color: '#a000f0',
    shadow: '#660099',
    shapes: [
      [[0,1],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[1,1],[2,0]],
      [[0,0],[0,1],[0,2],[1,1]],
      [[0,1],[1,0],[1,1],[2,1]],
    ],
  },
  S: {
    color: '#00f000',
    shadow: '#009900',
    shapes: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
    ],
  },
  Z: {
    color: '#f00000',
    shadow: '#990000',
    shapes: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
    ],
  },
  J: {
    color: '#0000f0',
    shadow: '#000099',
    shapes: [
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,0],[0,1],[1,0],[2,0]],
      [[0,0],[0,1],[0,2],[1,2]],
      [[0,0],[1,0],[2,0],[2,-1]],
    ],
  },
  L: {
    color: '#f0a000',
    shadow: '#996600',
    shapes: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[2,0],[2,1]],
      [[0,0],[0,1],[0,2],[1,0]],
      [[0,0],[0,1],[1,1],[2,1]],
    ],
  },
};

const PIECE_NAMES = Object.keys(PIECES);

// Scoring
const LINE_POINTS = [0, 100, 300, 500, 800];
const LINES_PER_LEVEL = 10;

// Speed (ms per drop) per level
function getSpeed(level) {
  const speeds = [800, 720, 630, 550, 470, 380, 300, 220, 150, 100, 80, 60, 50, 40, 30];
  return speeds[Math.min(level - 1, speeds.length - 1)];
}

// ============================================================
// Game State
// ============================================================

let board = [];
let currentPiece = null;
let nextPieceType = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let dropTimer = null;
let animationId = null;
let bag = [];

// DOM
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const pauseOverlay = document.getElementById('pause-overlay');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const finalScoreEl = document.getElementById('final-score');
const finalLevelEl = document.getElementById('final-level');
const finalLinesEl = document.getElementById('final-lines');

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', showMenu);

// ============================================================
// Screen Management
// ============================================================

function showScreen(screen) {
  [startScreen, gameScreen, gameoverScreen].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function showMenu() {
  clearInterval(dropTimer);
  cancelAnimationFrame(animationId);
  showScreen(startScreen);
}

// ============================================================
// Board
// ============================================================

function createBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// ============================================================
// Piece Bag (7-bag randomizer)
// ============================================================

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getNextPieceType() {
  if (bag.length === 0) {
    bag = shuffleArray([...PIECE_NAMES]);
  }
  return bag.pop();
}

// ============================================================
// Piece
// ============================================================

function createPiece(type) {
  const def = PIECES[type];
  return {
    type,
    color: def.color,
    shadow: def.shadow,
    rotation: 0,
    x: Math.floor(COLS / 2) - 1,
    y: 0,
    shapes: def.shapes,
  };
}

function getPieceBlocks(piece, rotation, x, y) {
  const shape = piece.shapes[rotation !== undefined ? rotation : piece.rotation];
  return shape.map(([r, c]) => ({ row: y + r, col: x + c }));
}

function getCurrentBlocks() {
  return getPieceBlocks(currentPiece, currentPiece.rotation, currentPiece.x, currentPiece.y);
}

// ============================================================
// Collision
// ============================================================

function isValid(piece, rotation, x, y) {
  const blocks = getPieceBlocks(piece, rotation, x, y);
  return blocks.every(({ row, col }) => {
    return col >= 0 && col < COLS && row < ROWS && (row < 0 || board[row][col] === null);
  });
}

// ============================================================
// Lock Piece
// ============================================================

function lockPiece() {
  const blocks = getCurrentBlocks();
  let aboveBoard = false;

  blocks.forEach(({ row, col }) => {
    if (row < 0) {
      aboveBoard = true;
      return;
    }
    board[row][col] = { color: currentPiece.color, shadow: currentPiece.shadow };
  });

  if (aboveBoard) {
    endGame();
    return;
  }

  clearLines();
  spawnPiece();
}

// ============================================================
// Clear Lines
// ============================================================

function clearLines() {
  let cleared = 0;

  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++; // re-check this row
    }
  }

  if (cleared > 0) {
    score += LINE_POINTS[cleared] * level;
    lines += cleared;

    const newLevel = Math.floor(lines / LINES_PER_LEVEL) + 1;
    if (newLevel !== level) {
      level = newLevel;
      resetDropTimer();
    }

    updateUI();
  }
}

// ============================================================
// Spawn
// ============================================================

function spawnPiece() {
  const type = nextPieceType || getNextPieceType();
  currentPiece = createPiece(type);
  nextPieceType = getNextPieceType();

  // Adjust spawn position - try to center
  if (currentPiece.type === 'I') {
    currentPiece.x = 3;
    currentPiece.y = -1;
  } else if (currentPiece.type === 'O') {
    currentPiece.x = 4;
    currentPiece.y = 0;
  } else {
    currentPiece.x = 3;
    currentPiece.y = 0;
  }

  if (!isValid(currentPiece, currentPiece.rotation, currentPiece.x, currentPiece.y)) {
    endGame();
  }

  drawNextPiece();
}

// ============================================================
// Movement
// ============================================================

function moveLeft() {
  if (isValid(currentPiece, currentPiece.rotation, currentPiece.x - 1, currentPiece.y)) {
    currentPiece.x--;
  }
}

function moveRight() {
  if (isValid(currentPiece, currentPiece.rotation, currentPiece.x + 1, currentPiece.y)) {
    currentPiece.x++;
  }
}

function moveDown() {
  if (isValid(currentPiece, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
    return true;
  }
  return false;
}

function softDrop() {
  if (moveDown()) {
    score += 1;
    updateUI();
  } else {
    lockPiece();
  }
}

function hardDrop() {
  let dropDistance = 0;
  while (isValid(currentPiece, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
    dropDistance++;
  }
  score += dropDistance * 2;
  updateUI();
  lockPiece();
}

function rotate() {
  const newRotation = (currentPiece.rotation + 1) % 4;

  // Try normal rotation
  if (isValid(currentPiece, newRotation, currentPiece.x, currentPiece.y)) {
    currentPiece.rotation = newRotation;
    return;
  }

  // Wall kick: try offsets
  const kicks = [
    [1, 0], [-1, 0], [0, -1], [2, 0], [-2, 0],
  ];

  for (const [dx, dy] of kicks) {
    if (isValid(currentPiece, newRotation, currentPiece.x + dx, currentPiece.y + dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
      currentPiece.rotation = newRotation;
      return;
    }
  }
}

// ============================================================
// Ghost Piece (drop shadow)
// ============================================================

function getGhostY() {
  let ghostY = currentPiece.y;
  while (isValid(currentPiece, currentPiece.rotation, currentPiece.x, ghostY + 1)) {
    ghostY++;
  }
  return ghostY;
}

// ============================================================
// Drawing
// ============================================================

function drawBlock(context, x, y, color, shadowColor, size) {
  // Main block
  context.fillStyle = color;
  context.fillRect(x + 1, y + 1, size - 2, size - 2);

  // Highlight (top-left)
  context.fillStyle = lightenColor(color, 40);
  context.fillRect(x + 1, y + 1, size - 2, 3);
  context.fillRect(x + 1, y + 1, 3, size - 2);

  // Shadow (bottom-right)
  context.fillStyle = shadowColor;
  context.fillRect(x + size - 4, y + 4, 3, size - 5);
  context.fillRect(x + 4, y + size - 4, size - 5, 3);

  // Inner shine
  context.fillStyle = lightenColor(color, 20);
  context.fillRect(x + 4, y + 4, size - 8, size - 8);
}

function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function drawBoard() {
  // Background
  ctx.fillStyle = '#111118';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
  }

  // Locked blocks
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        drawBlock(ctx, c * BLOCK_SIZE, r * BLOCK_SIZE, board[r][c].color, board[r][c].shadow, BLOCK_SIZE);
      }
    }
  }
}

function drawGhost() {
  if (!currentPiece) return;
  const ghostY = getGhostY();
  if (ghostY === currentPiece.y) return;

  const blocks = getPieceBlocks(currentPiece, currentPiece.rotation, currentPiece.x, ghostY);
  ctx.globalAlpha = 0.2;
  blocks.forEach(({ row, col }) => {
    if (row >= 0) {
      drawBlock(ctx, col * BLOCK_SIZE, row * BLOCK_SIZE, currentPiece.color, currentPiece.shadow, BLOCK_SIZE);
    }
  });
  ctx.globalAlpha = 1;
}

function drawCurrentPiece() {
  if (!currentPiece) return;
  const blocks = getCurrentBlocks();
  blocks.forEach(({ row, col }) => {
    if (row >= 0) {
      drawBlock(ctx, col * BLOCK_SIZE, row * BLOCK_SIZE, currentPiece.color, currentPiece.shadow, BLOCK_SIZE);
    }
  });
}

function drawNextPiece() {
  nextCtx.fillStyle = 'rgba(0,0,0,0.3)';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPieceType) return;

  const piece = createPiece(nextPieceType);
  const shape = piece.shapes[0];

  // Calculate bounds for centering
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  shape.forEach(([r, c]) => {
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  });

  const pieceW = (maxC - minC + 1) * BLOCK_SIZE;
  const pieceH = (maxR - minR + 1) * BLOCK_SIZE;
  const offsetX = (nextCanvas.width - pieceW) / 2 - minC * BLOCK_SIZE;
  const offsetY = (nextCanvas.height - pieceH) / 2 - minR * BLOCK_SIZE;

  shape.forEach(([r, c]) => {
    drawBlock(
      nextCtx,
      offsetX + c * BLOCK_SIZE,
      offsetY + r * BLOCK_SIZE,
      piece.color,
      piece.shadow,
      BLOCK_SIZE,
    );
  });
}

// ============================================================
// UI Update
// ============================================================

function updateUI() {
  scoreEl.textContent = score.toLocaleString();
  levelEl.textContent = level;
  linesEl.textContent = lines;
}

// ============================================================
// Game Loop
// ============================================================

function gameLoop() {
  if (gameOver) return;

  drawBoard();
  drawCurrentPiece();

  animationId = requestAnimationFrame(gameLoop);
}

function dropTick() {
  if (gameOver || paused) return;

  if (!moveDown()) {
    lockPiece();
  }
}

function resetDropTimer() {
  clearInterval(dropTimer);
  dropTimer = setInterval(dropTick, getSpeed(level));
}

// ============================================================
// Game Control
// ============================================================

function startGame() {
  createBoard();
  score = 0;
  level = 1;
  lines = 0;
  gameOver = false;
  paused = false;
  bag = [];
  nextPieceType = null;
  currentPiece = null;

  updateUI();
  showScreen(gameScreen);
  pauseOverlay.classList.add('hidden');

  spawnPiece();
  resetDropTimer();

  cancelAnimationFrame(animationId);
  gameLoop();
}

function endGame() {
  gameOver = true;
  clearInterval(dropTimer);
  cancelAnimationFrame(animationId);

  finalScoreEl.textContent = score.toLocaleString();
  finalLevelEl.textContent = level;
  finalLinesEl.textContent = lines;

  setTimeout(() => {
    showScreen(gameoverScreen);
  }, 500);
}

function togglePause() {
  if (gameOver) return;

  paused = !paused;
  if (paused) {
    clearInterval(dropTimer);
    pauseOverlay.classList.remove('hidden');
  } else {
    resetDropTimer();
    pauseOverlay.classList.add('hidden');
  }
}

// ============================================================
// Input
// ============================================================

document.addEventListener('keydown', (e) => {
  if (gameOver) return;

  // Allow pause toggle even when paused
  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (paused) return;
  if (!currentPiece) return;

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      moveLeft();
      break;
    case 'ArrowRight':
      e.preventDefault();
      moveRight();
      break;
    case 'ArrowDown':
      e.preventDefault();
      softDrop();
      break;
    case 'ArrowUp':
      e.preventDefault();
      rotate();
      break;
    case ' ':
      e.preventDefault();
      hardDrop();
      break;
  }
});
