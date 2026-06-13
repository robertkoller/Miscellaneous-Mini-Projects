#!/usr/bin/env node
'use strict';

const TRIALS = 100;
const BENCH_DEPTH = 5; // 7 is browser version, but is pretty slow, raise for better but slower

const {
  applyLeft, applyDown, applyRight, applyUp,
  rowsEqual, expectimax, scoreForMove, addRandomTile, maxTileValue,
} = require('./gameLogic.js');

// One game

function runGame() {
  let rows = addRandomTile(addRandomTile([0, 0, 0, 0]));
  let score = 0, moveCount = 0;
  const MOVES = [applyLeft, applyDown, applyRight, applyUp];

  while (true) {
    let bestFn = null, bestNb = null, bestScore = -Infinity;
    for (const fn of MOVES) {
      const nb = fn(rows);
      if (rowsEqual(nb, rows)) continue;
      const s = expectimax(nb, BENCH_DEPTH - 1, false);
      if (s > bestScore) { bestScore = s; bestFn = fn; bestNb = nb; }
    }
    if (!bestFn) break;

    score += scoreForMove(rows, bestFn);
    rows = addRandomTile(bestNb);
    moveCount++;
  }

  return { score, moveCount, maxTile: maxTileValue(rows) };
}

// Benchmark - this is to see statistics on how good the algorithm is

console.log(`Running ${TRIALS} trials at search depth ${BENCH_DEPTH}...\n`);
const start = Date.now();
const results = [];
const tileCounts = {};

for (let i = 0; i < TRIALS; i++) {
  const t0 = Date.now();
  const r  = runGame();
  r.ms     = Date.now() - t0;
  results.push(r);
  tileCounts[r.maxTile] = (tileCounts[r.maxTile] || 0) + 1;
  process.stdout.write(`\r  Trial ${String(i + 1).padStart(3)}/${TRIALS}  max =${String(r.maxTile).padStart(5)}  score = ${String(r.score).padStart(7)}  moves = ${r.moveCount}`);
}

const totalMs = Date.now() - start;
const scores  = results.map(r => r.score);
const moves   = results.map(r => r.moveCount);

const sum = arr => arr.reduce((a, b) => a + b, 0);
const avg = arr => sum(arr) / arr.length;
const pct = n   => ((n / TRIALS) * 100).toFixed(1) + '%';

console.log('\n\n══════════════════════════════════════════');
console.log(`  Results: ${TRIALS} games  (depth ${BENCH_DEPTH})`);
console.log('══════════════════════════════════════════');
console.log(`  Win rate (≥2048) : ${pct(results.filter(r => r.maxTile >= 2048).length)}`);
console.log(`  Avg score        : ${Math.round(avg(scores)).toLocaleString()}`);
console.log(`  Max score        : ${Math.max(...scores).toLocaleString()}`);
console.log(`  Min score        : ${Math.min(...scores).toLocaleString()}`);
console.log(`  Avg moves/game   : ${Math.round(avg(moves))}`);
console.log(`  Avg time/game    : ${Math.round(totalMs / TRIALS)}ms`);
console.log(`  Total time       : ${(totalMs / 1000).toFixed(1)}s`);
console.log('\n  Max tile distribution:');
for (const tile of [128, 256, 512, 1024, 2048, 4096, 8192].filter(t => tileCounts[t])) {
  const bar = '█'.repeat(Math.round(tileCounts[tile] / TRIALS * 40));
  console.log(`    ${String(tile).padStart(5)}  ${bar} ${tileCounts[tile]} (${pct(tileCounts[tile])})`);
}
console.log('══════════════════════════════════════════');
