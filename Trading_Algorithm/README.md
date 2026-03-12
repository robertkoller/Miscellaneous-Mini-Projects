# Crypto & Stock Reversal Scanner

> **DISCLAIMER: This tool is for educational and exploratory purposes only. Do not use it to make actual investment or trading decisions. Cryptocurrency and stock markets are highly volatile and unpredictable. Past price patterns do not guarantee future results. You could/will lose money. Always do your own research.**

---

## What it does

This tool scans cryptocurrencies and stocks and ranks them by how strongly they match a specific price pattern:

1. A **consistent downward trend** over roughly the last 10 months
2. A **clear reversal** around 3 weeks ago, followed by an upward trend since

The idea is to surface assets that may have bottomed out and started recovering — though this is a hypothesis, not a prediction.

---

## Project structure

```
tradingAlgorithm/
├── client/
│   ├── index.html          Frontend UI (served by Express)
│   ├── getPrices.js        Fetches historical crypto candles from Coinbase
│   ├── getStockPrices.js   Fetches historical stock prices from Yahoo Finance
│   └── analyzePrices.js    Linear regression, scoring, and batched evaluation
└── server/
    ├── package.json
    └── server.js           Express server — serves UI, streams scores via SSE
```

---

## Setup

Requires Node.js 18 or later (for built-in `fetch`).

```bash
cd tradingAlgorithm/server
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

To stop the server: press **Ctrl+C** in the terminal.

---

## How to use

The page has two tabs: **Crypto** and **Stocks**. APIs are only called for the active tab — switching tabs cancels the current scan.

### Crypto tab

| Button | Assets scanned | Source |
|---|---|---|
| **10** | 10 major coins | Hardcoded list |
| **50** | 50 coins | Hardcoded list |
| **Top 100 live** | Top ~40–60 coins by market cap that trade on Coinbase | CoinGecko API + Coinbase products API |

Click any crypto symbol to open its Coinbase price page.

### Stocks tab

| Button | Assets scanned | Source |
|---|---|---|
| **25** | S&P 500 top 25 by market cap | Hardcoded list |
| **50** | S&P 500 top 50 by market cap | Hardcoded list |

Click any stock symbol to open its Yahoo Finance page.

Results stream into the table in real time as each asset is scored. The table re-sorts itself continuously so the highest-scoring assets appear at the top.

Switching between buttons mid-scan cancels the current scan and starts a fresh one.

---

## Understanding the table

| Column | Meaning |
|---|---|
| **#** | Current rank by score |
| **Symbol** | Ticker, links to Coinbase (crypto) or Yahoo Finance (stocks) |
| **Score** | Composite signal strength (higher = stronger pattern match) |
| **Long-term change** | Regression-estimated % price move over ~10 months. Negative (red) is what the pattern requires. |
| **Long-term R** | How linear/consistent that trend was. 1.0 = perfectly straight line, 0 = noise. |
| **Recent change** | Regression-estimated % price move over the last 3 weeks. Positive (green) is what the pattern requires. |
| **Recent R** | How consistent the recent upturn has been. |

Score color coding:
- **Green** — score >= 20, strong pattern match
- **Yellow** — score >= 8, moderate match
- **Grey** — score > 0, weak match
- **Dark grey** — score = 0, no match (asset was flat, rising long-term, or still falling recently)

A score of 0 is **not an error** — it means the asset doesn't fit the reversal pattern. Large-cap stocks in long-term uptrends (e.g. GOOGL, TSLA in bull markets) will legitimately score 0.

Assets that fail to load (delisted, API error, insufficient data) show a red error badge and are sorted to the bottom.

---

## How the score is calculated

Each asset is evaluated using two windows of historical daily price data:

- **Long-term window**: ~10 months of daily closes (up to 300 data points)
- **Recent window**: last 3 weeks of daily closes (~21 data points)

Crypto prices come from the Coinbase Exchange API. Stock prices come from Yahoo Finance using **adjusted close** prices, which account for dividends and stock splits (raw close prices would create artificial-looking drops in the regression).

A linear regression is run on each window independently, producing a slope and an R (correlation) value.

The slope is **normalized by the mean price** so that a 0.5%/day move looks the same whether the asset trades at $80,000 or $0.15. This makes scores comparable across all assets.

The recent window is split into an **early third** (~7 days, oldest) and a **late two-thirds** (~14 days, newest). The score has three components:

```
downScore     = max(0, -longTermSlope)  x |longTermR|
upScore       = max(0,  lateSlope)      x |lateR|  x recencyFactor
reversalBonus = max(0,  recentSlope - longTermSlope) x 0.3

recencyFactor = max(0.4,  1 - max(0, earlySlope / lateSlope) x 0.5)

score = (downScore + upScore + reversalBonus) x 10,000
```

- `downScore` is zero if the long-term trend was flat or upward
- `upScore` uses only the **late** portion of the recent window, rewarding uptrends that are fresh
- `recencyFactor` penalizes when the **early** portion of the recent window was also already rising — a full 3-week uptrend scores slightly lower than a 2-week one
- `reversalBonus` rewards the sharpness of the directional flip (uses the full recent window slope)
- Multiplying by `|R|` penalizes noisy, inconsistent trends

The effect on upturn length:
- **~1 week up** — `lateSlope` is moderate (half of the 14-day late window was still flat/declining) → lower score
- **~2 weeks up** — `lateSlope` is high, `earlySlope` ≤ 0, no recency penalty → highest score
- **~3 weeks up** — `lateSlope` is high but `earlySlope` is also positive → `recencyFactor` < 1 → slightly lower score

Typical scores range from 0 to ~50 for assets that strongly match the pattern.

---

## Changing the time windows

All time window parameters are in one place at the top of `client/analyzePrices.js`:

```js
export const CONFIG = {
  recentDays: 21,    // "recent upturn" window — change to 14 for 2 weeks
  longTermDays: 300, // "long decline" window — max 300 due to Coinbase API limit
};
```

---

## API rate limits and reliability

- **Coinbase Exchange API** (`api.exchange.coinbase.com`): public endpoints are limited to ~10 requests/second. The scanner uses batches of 3 assets with 800ms delays between batches to stay well within this limit. Individual requests automatically retry up to 4 times with exponential backoff (1s, 2s, 4s, 8s) if a 429 is received.
- **Yahoo Finance API** (used for stocks): unofficial API with no published rate limit. The same 3-asset batching with 800ms delays applies. Requests retry up to 3 times with exponential backoff on 429s.
- **CoinGecko API** (used only for "Top 100 live"): the free tier has a rate limit of ~10–30 calls/minute. If it fails, the scanner falls back to the hardcoded 50-coin list automatically.
- Some coins in the hardcoded list may have been delisted from Coinbase since it was written. These show as error rows and are sorted to the bottom.

---

## Limitations

- The pattern is purely mechanical — it finds assets that fit the shape, not assets that will actually continue rising.
- Linear regression on noisy price data is a simplification. Real price movement is not linear.
- The Coinbase Exchange API (`api.exchange.coinbase.com`) is the institutional/advanced trading API. Not all coins available on the consumer Coinbase app are listed here.
- The 300-candle limit per Coinbase API call means the crypto long-term window is capped at ~10 months, not a full year.
- A score of 0 means the asset does not match the reversal pattern — it is not an error. Assets in long-term uptrends will always score 0.
- The Yahoo Finance API is unofficial and undocumented. It may break without notice.
- **Do not trust this for financial decisions.**
