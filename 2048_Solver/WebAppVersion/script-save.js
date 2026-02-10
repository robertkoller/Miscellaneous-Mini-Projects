const grid = document.getElementById("grid");
const scoreEl = document.getElementById("score");
const highestEl = document.getElementById("highest");
const resetBtn = document.getElementById("resetBtn");
const aiBtn = document.getElementById("aiBtn");

let aiInterval = null;



let board = Array(4).fill().map(() => Array(4).fill(0));
let score = 0;
let highest = 0;
let tileElements = {}; // Track tile DOM elements by position
let nextTileId = 0; // Unique ID for each tile

function init() {
  addRandomTile();
  addRandomTile();
  render();
}

function addRandomTile() {
  let empty = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return;

  let [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  
  // Mark this tile as new for animation
  return { r, c, isNew: true };
}

function render(newTilePos = null) {
  grid.innerHTML = "";
  
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const value = board[r][c];
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

resetBtn.addEventListener("click", resetGame);

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

aiBtn.addEventListener("click", () => {
  if (aiInterval) {
    stopAI();
    aiBtn.textContent = "Start AI";
  } else {
    startAI();
    aiBtn.textContent = "Stop AI";
  }
});

function aiStep() {
  const moves = ["left", "right", "up", "down"];
  const dir = moves[Math.floor(Math.random() * moves.length)];
  move(dir);
}




function resetGame() {
  stopAI();
  aiBtn.textContent = "Start AI";

  board = Array(4).fill().map(() => Array(4).fill(0));
  score = 0;
  highest = 0;

  addRandomTile();
  addRandomTile();
  render();
}


function render(newTilePos = null) {
  grid.innerHTML = "";
  
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const value = board[r][c];
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

function merge(line) {
  let filtered = line.filter(v => v !== 0);
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      score += filtered[i];
      highest = Math.max(highest, filtered[i]);
      filtered[i + 1] = 0;
    }
  }
  return filtered.filter(v => v !== 0).concat(Array(4).fill(0)).slice(0, 4);
}

function moveLeft() {
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

  const moved = moveLeft();

  for (let i = 0; i < (4 - rotations) % 4; i++) rotateBoardCCW();

  if (moved) {
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