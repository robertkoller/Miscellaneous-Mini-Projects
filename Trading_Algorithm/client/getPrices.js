const COINBASE_API = "https://api.exchange.coinbase.com";

function toISOTimestamp(date) {
  return date.toISOString().split(".")[0] + "Z";
}

// Fetch daily candles for a crypto between two dates.
// Coinbase returns [time, low, high, open, close, volume] newest-first.
// Returns [{date, close}] sorted oldest-first.
// Retries up to MAX_RETRIES times on 429 (rate limit), with exponential backoff.
const MAX_RETRIES = 4;

async function fetchCandles(crypto, startDate, endDate) {
  const url =
    `${COINBASE_API}/products/${crypto}/candles` +
    `?granularity=86400` +
    `&start=${toISOTimestamp(startDate)}` +
    `&end=${toISOTimestamp(endDate)}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url);

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      const wait = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
      await new Promise(res => setTimeout(res, wait));
      continue;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status} for ${crypto}`);

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(data.message || `Unexpected response for ${crypto}`);
    }

    return data
      .map(([time, , , , close]) => ({
        date: new Date(time * 1000).toISOString().split("T")[0],
        close,
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }
}

// Fetch price history
// Both fetches run in parallel
export async function fetchPricesForAnalysis(
  crypto,
  recentDays = 21,
  longTermDays = 300
) {
  const now = new Date();

  const recentStart = new Date(now);
  recentStart.setDate(now.getDate() - recentDays);

  const longTermStart = new Date(now);
  longTermStart.setDate(now.getDate() - longTermDays);

  const [longTerm, recent] = await Promise.all([
    fetchCandles(crypto, longTermStart, recentStart),
    fetchCandles(crypto, recentStart, now),
  ]);

  return { longTerm, recent };
}
