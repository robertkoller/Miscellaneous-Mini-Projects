# 2048 Solver

A browser-based 2048 game with an AI that plays it automatically using the Expectimax algorithm.

My max score is 103,668 with the bot beating me once when I ran the depth 7 100 trials. Overall I would say I am a little better than my algorithm but I am still happy how well this turned out and plus the bot is faster.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Game UI |
| `style.css` | Styling |
| `gameLogic.js` | All pure AI logic — shared by the browser and the benchmark |
| `script.js` | DOM/game logic: rendering, input, tile movement, calls into gameLogic |
| `benchmark.js` | Node.js script that runs N headless games and prints statistics |

## How to play

Open `index.html` in a browser. Use arrow keys to play manually, or click **Start AI** to let the algorithm take over. The **AI Speed** input controls the delay between AI moves in milliseconds.

## How to benchmark

Runs 100 full games headlessly and prints win rate, score stats, and tile distribution:

```bash
node benchmark.js
```

## How the AI works

### Board representation

Each row of 4 tiles is packed into a single 16-bit integer — 4 bits per cell, storing the tile value as an exponent (0 = empty, 1 = tile 2, 2 = tile 4, ..., 11 = tile 2048). The full board is 4 of these integers.

### Precomputed tables (computed once at startup)

**`LEFT_TABLE[65536]`** — for every possible row encoding, stores the result of sliding and merging that row left. All four move directions (left, right, up, down) are derived from this single table using row reversal and board transposition.

**`SCORE_TABLE[65536]`** — for every row, stores the points earned by merging it left. Used by the benchmark to track game score.

**`HEUR_TABLE[65536]`** — for every row, stores a heuristic quality score. The board evaluation sums this table across all 4 rows and all 4 columns (via transpose), giving 8 lookups total per board state. Uses the nneonneo heuristic weights:
- **Empty cells** — rewarded (270 per empty cell in the row)
- **Mergeability** — rewarded (700 per adjacent equal pair)
- **Sum penalty** — penalised for large tile values sitting unmerged (weight 11, power 3.5)
- **Monotonicity** — penalised when tiles aren't ordered in a consistent direction (weight 47, power 4.0)

### Expectimax search

The AI uses [Expectimax](https://en.wikipedia.org/wiki/Expectiminimax), which models the two alternating phases of 2048:

- **Player node** — tries all 4 move directions, picks the one with the highest expected value
- **Chance node** — averages over all cells where a random tile could spawn, weighted 90% for a 2-tile and 10% for a 4-tile

When there are more than 8 empty cells at a chance node, 8 are sampled randomly (Fisher-Yates partial shuffle) to keep the tree tractable.

The browser version searches at **depth 7**. The benchmark uses **depth 5** for speed.

## Benchmark results (depth 5, 100 trials)

```
══════════════════════════════════════════
  Results: 100 games  (depth 5)
══════════════════════════════════════════
  Win rate (≥2048) : 59.0%
  Avg score        : 25,609
  Max score        : 67,656
  Min score        : 792
  Avg moves/game   : 1,323
  Avg time/game    : 388ms
  Total time       : 38.8s

  Max tile distribution:
      128  █ 2 (2.0%)
      256    1 (1.0%)
      512  █████ 12 (12.0%)
     1024  ██████████ 26 (26.0%)
     2048  ████████████████████ 49 (49.0%)
     4096  ████ 10 (10.0%)
══════════════════════════════════════════
```

Depth 5 is used in the benchmark trials however browser version has depth 7, shown below.

## Benchmark results (depth 7, 100 trials)

```
══════════════════════════════════════════
  Results: 100 games  (depth 7)
══════════════════════════════════════════
  Win rate (≥2048) : 80.0%
  Avg score        : 41,760
  Max score        : 114,308
  Min score        : 2,556
  Avg moves/game   : 2005
  Avg time/game    : 67277ms
  Total time       : 6727.7s

  Max tile distribution:
      256  ██ 4 (4.0%)
      512  █ 2 (2.0%)
     1024  ██████ 14 (14.0%)
     2048  ███████████████ 38 (38.0%)
     4096  ████████████████ 41 (41.0%)
     8192   1 (1.0%)
══════════════════════════════════════════
```
