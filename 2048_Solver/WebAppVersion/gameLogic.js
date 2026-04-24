'use strict';

const SEARCH_DEPTH = 7;

// Board cells are stored as exponents (0 = empty, n = tile 2^n).
// A row of 4 cells fits in 16 bits (4 bits × 4 cells).

const LEFT_TABLE  = new Int32Array(65536);
const SCORE_TABLE = new Float64Array(65536);

for (let row = 0; row < 65536; row++) {
  let a = [row & 0xf, (row >> 4) & 0xf, (row >> 8) & 0xf, (row >> 12) & 0xf];
  let sc = 0;
  a = a.filter(v => v !== 0);
  while (a.length < 4) a.push(0);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== 0 && a[i] === a[i + 1]) {
      a[i]++;
      sc += Math.pow(2, a[i]);
      a[i + 1] = 0;
    }
  }
  a = a.filter(v => v !== 0);
  while (a.length < 4) a.push(0);
  LEFT_TABLE[row]  = a[0] | (a[1] << 4) | (a[2] << 8) | (a[3] << 12);
  SCORE_TABLE[row] = sc;
}

// Heuristic stuff

const HEUR_TABLE = new Float64Array(65536);

{
  const MONO_POWER   = 4.0,  MONO_WEIGHT  = 47.0;
  const SUM_POWER    = 3.5,  SUM_WEIGHT   = 11.0;
  const MERGE_WEIGHT = 700.0, EMPTY_WEIGHT = 270.0;

  for (let row = 0; row < 65536; row++) {
    const line = [row & 0xf, (row >> 4) & 0xf, (row >> 8) & 0xf, (row >> 12) & 0xf];
    let score = 0, merges = 0, prev = 0, counter = 0;
    for (let i = 0; i < 4; i++) {
      const rank = line[i];
      if (rank === 0) { score += EMPTY_WEIGHT; }
      else {
        if (prev === rank) counter++; else counter = 0;
        prev = rank;
        merges += counter;
        score -= SUM_WEIGHT * Math.pow(rank, SUM_POWER);
      }
    }
    score += MERGE_WEIGHT * merges;
    let monoL = 0, monoR = 0;
    for (let i = 1; i < 4; i++) {
      if (line[i-1] > line[i]) monoL += Math.pow(line[i-1], MONO_POWER) - Math.pow(line[i], MONO_POWER);
      else                     monoR += Math.pow(line[i], MONO_POWER) - Math.pow(line[i-1], MONO_POWER);
    }
    score -= MONO_WEIGHT * Math.min(monoL, monoR);
    HEUR_TABLE[row] = score;
  }
}

// Board Operations

function reverseRow(r) {
  return ((r & 0xf) << 12) | (((r >> 4) & 0xf) << 8) | (((r >> 8) & 0xf) << 4) | ((r >> 12) & 0xf);
}

function transpose(rows) {
  const t = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      t[c] |= (((rows[r] >> (c * 4)) & 0xf) << (r * 4));
  return t;
}

function applyLeft(rows)  { return [LEFT_TABLE[rows[0]], LEFT_TABLE[rows[1]], LEFT_TABLE[rows[2]], LEFT_TABLE[rows[3]]]; }
function applyRight(rows) { return rows.map(r => reverseRow(LEFT_TABLE[reverseRow(r)])); }
function applyUp(rows)    { const t = transpose(rows); return transpose(applyLeft(t)); }
function applyDown(rows)  { const t = transpose(rows); return transpose(applyRight(t)); }
function rowsEqual(a, b)  { return a[0]===b[0] && a[1]===b[1] && a[2]===b[2] && a[3]===b[3]; }

function getEmpties(rows) {
  const out = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (((rows[r] >> (c * 4)) & 0xf) === 0) out.push(r * 4 + c);
  return out;
}

function setCell(rows, idx, exp) {
  const nr = rows.slice();
  const r = idx >> 2, c = idx & 3;
  nr[r] = (rows[r] & ~(0xf << (c * 4))) | (exp << (c * 4));
  return nr;
}

function evaluateFast(rows) {
  const t = transpose(rows);
  return HEUR_TABLE[rows[0]] + HEUR_TABLE[rows[1]] + HEUR_TABLE[rows[2]] + HEUR_TABLE[rows[3]]
       + HEUR_TABLE[t[0]]    + HEUR_TABLE[t[1]]    + HEUR_TABLE[t[2]]    + HEUR_TABLE[t[3]];
}

function expectimax(rows, depth, isPlayer) {
  if (depth === 0) return evaluateFast(rows);

  if (isPlayer) {
    let best = -Infinity;
    for (const fn of [applyLeft, applyDown, applyRight, applyUp]) {
      const nb = fn(rows);
      if (rowsEqual(nb, rows)) continue;
      const v = expectimax(nb, depth - 1, false);
      if (v > best) best = v;
    }
    return best === -Infinity ? evaluateFast(rows) : best;
  } else {
    const empties = getEmpties(rows);
    if (!empties.length) return evaluateFast(rows);
    let sample = empties;
    if (empties.length > 8) {
      sample = empties.slice();
      for (let i = 0; i < 8; i++) {
        const j = i + Math.floor(Math.random() * (sample.length - i));
        [sample[i], sample[j]] = [sample[j], sample[i]];
      }
      sample = sample.slice(0, 8);
    }
    let total = 0;
    for (const idx of sample) {
      total += 0.9 * expectimax(setCell(rows, idx, 1), depth - 1, true);
      total += 0.1 * expectimax(setCell(rows, idx, 2), depth - 1, true);
    }
    return total / sample.length;
  }
}

// Benchmark Helpers

function scoreForMove(rows, fn) {
  if (fn === applyLeft)  return SCORE_TABLE[rows[0]] + SCORE_TABLE[rows[1]] + SCORE_TABLE[rows[2]] + SCORE_TABLE[rows[3]];
  if (fn === applyRight) return rows.reduce((s, r) => s + SCORE_TABLE[reverseRow(r)], 0);
  const t = transpose(rows);
  if (fn === applyUp)    return SCORE_TABLE[t[0]] + SCORE_TABLE[t[1]] + SCORE_TABLE[t[2]] + SCORE_TABLE[t[3]];
  return t.reduce((s, r) => s + SCORE_TABLE[reverseRow(r)], 0);
}

function addRandomTile(rows) {
  const empties = getEmpties(rows);
  if (!empties.length) return rows;
  const idx = empties[Math.floor(Math.random() * empties.length)];
  const exp = Math.random() < 0.9 ? 1 : 2;
  return setCell(rows, idx, exp);
}

function maxTileValue(rows) {
  let max = 0;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const e = (rows[r] >> (c * 4)) & 0xf;
      if (e > max) max = e;
    }
  return max === 0 ? 0 : Math.pow(2, max);
}

if (typeof module !== 'undefined') {
  module.exports = {
    SEARCH_DEPTH, LEFT_TABLE, SCORE_TABLE, HEUR_TABLE,
    reverseRow, transpose, applyLeft, applyRight, applyUp, applyDown,
    rowsEqual, getEmpties, setCell, evaluateFast, expectimax,
    scoreForMove, addRandomTile, maxTileValue,
  };
}
