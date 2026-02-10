const grid = document.getElementById("grid");
const scoreEl = document.getElementById("score");
const highestEl = document.getElementById("highest");
const resetBtn = document.getElementById("resetBtn");
const aiBtn = document.getElementById("aiBtn");

let aiInterval = null;
let emptyPlaces = new Set([
  0, 1, 2, 3,
  4, 5, 6, 7,
  8, 9, 10, 11,
  12, 13, 14, 15
]);
let board = Array.from({ length: 4 }, () => Array(4).fill(null));
let score = 0;
let highest = 0;

function init() {
  addRandomTile();
  addRandomTile();
  render();
}
// Positive numbers means mergable and how many spots away, negative means non mergable and how many spots away,
// 0 means all empty spots in that direction, -2 means mergable but no empty spots in between, -1 means non mergable and no empty spots in between
const pieceTemplate = {
  left: { emptySpaces: 0, firstBlockDistance: null, mergeable: false },
  right: { emptySpaces: 0, firstBlockDistance: null, mergeable: false },
  up: { emptySpaces: 0, firstBlockDistance: null, mergeable: false },
  down: { emptySpaces: 0, firstBlockDistance: null, mergeable: false },
  value: 2
};


function evaluateDirection(piece, dx, dy) {
  let emptySpaces = 0;
  let firstBlockDistance = null;
  let mergeable = false;

  let x = piece.xPos;
  let y = piece.yPos;
  let distance = 1;

  while (true) {
    x += dx;
    y += dy;

    if (x < 0 || x >= 4 || y < 0 || y >= 4) {
      break;
    }

    const cell = board[x][y];

    if (cell === null) {
      emptySpaces++;
    } else {
      firstBlockDistance = distance;
      if (cell.value === piece.value) {
        mergeable = true;
      }
      break;
    }

    distance++;
  }

  return { emptySpaces, firstBlockDistance, mergeable };
}

function evaluatePiece(piece) {
  piece.down = evaluateDirection(piece, 1, 0);
  piece.up = evaluateDirection(piece, -1, 0);
  piece.right = evaluateDirection(piece, 0, 1);
  piece.left = evaluateDirection(piece, 0, -1);

  return piece;
}

function render(newTilePos = null) {
  grid.innerHTML = "";

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = board[r][c];
      const value = cell ? cell.value : 0;
      const tile = document.createElement("div");
      tile.className = `tile tile-${value}`;

      // Add 'new' class for newly created tiles
      if (newTilePos && newTilePos.r === r && newTilePos.c === c && newTilePos.isNew) {
        tile.classList.add("new");
      }

      tile.textContent = value || "";
      tile.style.gridRow = r + 1;
      tile.style.gridColumn = c + 1;

      grid.appendChild(tile);
    }
  }
  scoreEl.textContent = score;
  highestEl.textContent = highest;
}

function addRandomTile() {
  if (emptyPlaces.size === 0) return null;

  const empties = Array.from(emptyPlaces);
  const index = empties[Math.floor(Math.random() * empties.length)];

  const xPos = Math.floor(index / 4);
  const yPos = index % 4;

  const value = Math.random() < 0.9 ? 2 : 4;

  const piece = {
    value,
    xPos,
    yPos,
    left: {},
    right: {},
    up: {},
    down: {}
  };

  evaluatePiece(piece);
  board[xPos][yPos] = piece;
  emptyPlaces.delete(index);
  reevaluateBoard();
  return piece;
}
resetBtn.addEventListener("click", resetGame);

function resetGame() {
  stopAI();
  aiBtn.textContent = "Start AI";

  board = Array.from({ length: 4 }, () => Array(4).fill(null));
  emptyPlaces = new Set([...Array(16).keys()]);

  score = 0;
  highest = 0;

  addRandomTile();
  addRandomTile();
  render();
}

aiBtn.addEventListener("click", () => {
  if (aiInterval) {
    stopAI();
    aiBtn.textContent = "Start AI";
  } else {
    startAI();
    aiBtn.textContent = "Stop AI";
  }
});

function startAI() {
  if (aiInterval) return;

  const speed = parseInt(document.getElementById("speedInput").value) || 50;
  aiInterval = setInterval(() => {
    aiStep();
  }, speed);
}

function stopAI() {
  if (aiInterval) {
    clearInterval(aiInterval);
    aiInterval = null;
  }
}

function hasMoves(direction) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = board[r][c];
      if (cell) {
        if (cell[direction].mergeable || cell[direction].emptySpaces > 0) {
          return { mergeable: cell[direction].mergeable, moveable: cell[direction].emptySpaces > 0 };
        }
      }
    }
  }
  return { mergeable: false, moveable: false };
}

function aiStep() {
  const moves = ["left", "right", "up", "down"];
  const left = hasMoves("left");
  const right = hasMoves("right");
  const up = hasMoves("up");
  const down = hasMoves("down");
  if (!(left.mergeable || left.moveable) && !(down.mergeable || down.moveable)) {
    if (up.mergeable || up.moveable) {
      move("up");
      if (hasMoves("down").mergeable || hasMoves("down").moveable) {
        move("down");
      }
      else if (left.mergeable || left.moveable) {
        move("left");
      }
    } else {
      move("right");
      move("left");
    }
    return;
  }
  else {
    if (down.mergeable) {
      move("down");
      return;
    }
    else {
      move("left");
      return;
    }
  }
  //const dir = moves[Math.floor(Math.random() * moves.length)];
  move(dir);
}

function reevaluateBoard() {
  // Rebuild emptyPlaces from scratch
  emptyPlaces.clear();
  
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c]) {
        board[r][c].xPos = r;
        board[r][c].yPos = c;
        evaluatePiece(board[r][c]);
      } else {
        // Add empty position to emptyPlaces
        emptyPlaces.add(r * 4 + c);
      }
    }
  }
}


function compress(line) {
  const filtered = line.filter(cell => cell !== null);
  while (filtered.length < 4) filtered.push(null);
  return filtered;
}

function merge(line) {
  line = compress(line);

  for (let i = 0; i < 3; i++) {
    if (
      line[i] &&
      line[i + 1] &&
      line[i].value === line[i + 1].value
    ) {
      line[i].value *= 2;
      score += line[i].value;
      highest = Math.max(highest, line[i].value);
      line[i + 1] = null;
    }
  }

  return compress(line);
}

function moveHelper(direction) {
  if (!hasMoves(direction).mergeable && !hasMoves(direction).moveable) return false;
  let moved = false;
  for (let r = 0; r < 4; r++) {
    let newRow = merge(board[r]);
    if (newRow.toString() !== board[r].toString()) moved = true;
    board[r] = newRow;
  }
  return moved;
}

function rotateBoardCCW() {
  board = board[0].map((_, i) =>
    board.map(row => row[3 - i])
  );
}

function move(direction) {
  const rotations = {
    left: 0,
    up: 1,
    right: 2,
    down: 3
  }[direction];

  for (let i = 0; i < rotations; i++) rotateBoardCCW();

  const moved = moveHelper(direction);
  

  for (let i = 0; i < (4 - rotations) % 4; i++) rotateBoardCCW();

  if (moved) {
    reevaluateBoard();
    // Render first to show movement
    render();

    // Add new tile after a short delay to let movement animation finish
    setTimeout(() => {
      const newTilePos = addRandomTile();
      render(newTilePos);
    }, 150);
  }
}

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") move("left");
  if (e.key === "ArrowRight") move("right");
  if (e.key === "ArrowUp") move("up");
  if (e.key === "ArrowDown") move("down");
});

init();