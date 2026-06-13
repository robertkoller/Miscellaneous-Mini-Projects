const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const MAX_RETRIES = 3;

// Fetch daily closes from Yahoo Finance for a given date range.
// Returns [{date, close}] sorted oldest-first.
// Yahoo Finance returns the full requested range in one call — no pagination needed.
async function fetchStockCandles(symbol, startDate, endDate) {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);
  const url = `${YAHOO_API}/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; research-tool/1.0)",
        "Accept":     "application/json",
      },
    });

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      const wait = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
      await new Promise(res => setTimeout(res, wait));
      continue;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status} for ${symbol}`);

    const json   = await response.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      const err = json?.chart?.error;
      throw new Error(err?.description || `No chart data returned for ${symbol}`);
    }

    const timestamps = result.timestamp || [];
    const closes     = result.indicators?.adjclose?.[0]?.adjclose
                    || result.indicators?.quote?.[0]?.close
                    || [];

    return timestamps
      .map((t, i) => ({
        date:  new Date(t * 1000).toISOString().split("T")[0],
        close: closes[i],
      }))
      .filter(d => d.close != null)
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }
}

// One API call covers the full range; we split by date in memory.
// This is more efficient than the two-call approach the Coinbase candle
// API requires (its 300-candle limit forces separate long-term/recent calls).
export async function fetchStockPricesForAnalysis(symbol, recentDays = 21, longTermDays = 300) {
  const now = new Date();

  const longTermStart = new Date(now);
  longTermStart.setDate(now.getDate() - longTermDays);

  const recentCutoff = new Date(now);
  recentCutoff.setDate(now.getDate() - recentDays);
  const cutoffStr = recentCutoff.toISOString().split("T")[0];

  const all = await fetchStockCandles(symbol, longTermStart, now);

  return {
    longTerm: all.filter(d => d.date <  cutoffStr),
    recent:   all.filter(d => d.date >= cutoffStr),
  };
}
