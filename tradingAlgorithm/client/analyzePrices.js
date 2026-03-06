import { fetchPricesForAnalysis      } from "./getPrices.js";
import { fetchStockPricesForAnalysis } from "./getStockPrices.js";

// Analysis Windows (in days)
export const CONFIG = {
  recentDays:   21,  // the "recent upturn" window (3 weeks)
  longTermDays: 300, // the "long decline" window (~0 months)
};

// Linear regression over an array of {date, close} objects.
// Uses the array index as x so the slope unit is "price per data point".
export function linearRegression(prices) {
  const n = prices.length;
  if (n < 2) return { slope: 0, intercept: 0, r: 0, rSquared: 0, meanY: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

  for (let i = 0; i < n; i++) {
    const y = prices[i].close;
    sumX  += i;
    sumY  += y;
    sumXY += i * y;
    sumXX += i * i;
    sumYY += y * y;
  }

  const meanY = sumY / n;
  const denom = n * sumXX - sumX * sumX;

  if (denom === 0) {
    return { slope: 0, intercept: meanY, r: 0, rSquared: 0, meanY };
  }

  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const rNum      = n * sumXY - sumX * sumY;
  const rDen      = Math.sqrt(denom * (n * sumYY - sumY * sumY));
  const r         = rDen === 0 ? 0 : rNum / rDen;

  return { slope, intercept, r, rSquared: r * r, meanY };
}

// Slope normalized by mean price
function normalizedSlope(stats) {
  return stats.meanY === 0 ? 0 : stats.slope / stats.meanY;
}

// Estimated total % change over the window, derived from the regression fit.
function totalPctChange(stats, numPoints) {
  return normalizedSlope(stats) * numPoints * 100;
}

// The recent window is split into an early third (7 days) and a late two-thirds (14 days).
// upScore is based on the late window so that the optimal upturn length is about 2 weeks:
export function computeScore(longTermStats, recentStats, earlyRecentStats, lateRecentStats) {
  const ltSlope    = normalizedSlope(longTermStats);
  const recSlope   = normalizedSlope(recentStats);
  const earlySlope = normalizedSlope(earlyRecentStats);
  const lateSlope  = normalizedSlope(lateRecentStats);
  const ltR        = Math.abs(longTermStats.r);
  const lateR      = Math.abs(lateRecentStats.r);

  const downScore = Math.max(0, -ltSlope)  * ltR;
  const upScore   = Math.max(0,  lateSlope) * lateR;

  // Penalize when the early portion of the recent window was already rising.
  // earlySlope <= 0 → asset was still declining at the start → no penalty.
  // earlySlope = lateSlope → full window rising → recencyFactor ≈ 0.5 (capped at 0.4).
  const recencyFactor = lateSlope > 0
    ? Math.max(0.4, 1 - Math.max(0, earlySlope) / (lateSlope + 1e-10) * 0.5)
    : 1;

  const reversalBonus = Math.max(0, recSlope - ltSlope) * 0.3;

  return (downScore + upScore * recencyFactor + reversalBonus) * 10_000;
}

// Generic Scoring
async function scoreAsset(symbol, fetchFn) {
  const { longTerm, recent } = await fetchFn(
    symbol,
    CONFIG.recentDays,
    CONFIG.longTermDays
  );

  if (longTerm.length < 10 || recent.length < 5) {
    // Return an error result rather than throwing.
    return { symbol, score: -1, error: "Insufficient data" };
  }

  // Split recent into early (first third) and late (last two-thirds) for recency scoring.
  const splitIdx        = Math.floor(recent.length / 3);
  const earlyRecent     = recent.slice(0, splitIdx);
  const lateRecent      = recent.slice(splitIdx);

  const longTermStats    = linearRegression(longTerm);
  const recentStats      = linearRegression(recent);
  const earlyRecentStats = linearRegression(earlyRecent);
  const lateRecentStats  = linearRegression(lateRecent);
  const score            = computeScore(longTermStats, recentStats, earlyRecentStats, lateRecentStats);

  return {
    symbol,
    score,
    longTerm: {
      r:           longTermStats.r,
      rSquared:    longTermStats.rSquared,
      totalChange: totalPctChange(longTermStats, longTerm.length),
    },
    recent: {
      r:           recentStats.r,
      rSquared:    recentStats.rSquared,
      totalChange: totalPctChange(recentStats, recent.length),
    },
  };
}

// Batch scoring with rate limiting and progress callback
async function scoreAll(symbolList, scoreFn, onProgress) {
  const BATCH_SIZE = 3;
  const DELAY_MS   = 800;
  const results    = [];

  for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
    const batch   = symbolList.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map(scoreFn));

    for (let j = 0; j < batch.length; j++) {
      const r     = settled[j];
      const entry = r.status === "fulfilled"
        ? r.value
        : { symbol: batch[j], score: -1, error: r.reason?.message || "Failed" };

      results.push(entry);
      try {
        onProgress?.(entry, results.length, symbolList.length);
      } catch (cbErr) {
        console.error("scoreAll: onProgress threw:", cbErr);
      }
    }

    if (i + BATCH_SIZE < symbolList.length) {
      await new Promise(res => setTimeout(res, DELAY_MS));
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// Public API
export const scoreCrypto     = (symbol) => scoreAsset(symbol, fetchPricesForAnalysis);
export const scoreStock      = (symbol) => scoreAsset(symbol, fetchStockPricesForAnalysis);

export const scoreAllCryptos = (symbols, onProgress) => scoreAll(symbols, scoreCrypto, onProgress);
export const scoreAllStocks  = (symbols, onProgress) => scoreAll(symbols, scoreStock,  onProgress);
