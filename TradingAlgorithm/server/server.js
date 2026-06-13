import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { scoreAllCryptos, scoreAllStocks } from "../client/analyzePrices.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Crypto Assets list
const CRYPTO_10 = [
  "BTC-USD", "ETH-USD", "SOL-USD", "ADA-USD", "DOGE-USD",
  "AVAX-USD", "LINK-USD", "DOT-USD", "LTC-USD", "ATOM-USD",
];

const CRYPTO_50 = [
  "BTC-USD", "ETH-USD", "SOL-USD", "ADA-USD", "DOGE-USD",
  "AVAX-USD", "LINK-USD", "DOT-USD", "LTC-USD", "ATOM-USD",
  "UNI-USD", "AAVE-USD", "MKR-USD", "COMP-USD", "GRT-USD",
  "SNX-USD", "CRV-USD", "BAL-USD", "ZRX-USD", "BAT-USD",
  "ZEC-USD", "ETC-USD", "XTZ-USD", "MANA-USD", "ENJ-USD",
  "STORJ-USD", "FET-USD", "ANKR-USD", "SKL-USD", "AXS-USD",
  "SAND-USD", "CHZ-USD", "ICP-USD", "FIL-USD", "NEAR-USD",
  "BCH-USD", "XLM-USD", "ALGO-USD", "LRC-USD", "NMR-USD",
  "SUSHI-USD", "YFI-USD", "REN-USD", "OMG-USD", "BAND-USD",
  "RUNE-USD", "KNC-USD", "GALA-USD", "MATIC-USD", "1INCH-USD",
];

const STABLECOINS = new Set([
  "USDT-USD", "USDC-USD", "BUSD-USD", "DAI-USD", "TUSD-USD",
  "USDP-USD", "FRAX-USD", "GUSD-USD", "PAX-USD", "USDD-USD",
]);

// coinbase.com/price slugs for the hardcoded crypto list
const CRYPTO_SLUGS = {
  "BTC-USD":   "bitcoin",           "ETH-USD":   "ethereum",
  "SOL-USD":   "solana",            "ADA-USD":   "cardano",
  "DOGE-USD":  "dogecoin",          "AVAX-USD":  "avalanche",
  "LINK-USD":  "chainlink",         "DOT-USD":   "polkadot",
  "LTC-USD":   "litecoin",          "ATOM-USD":  "cosmos",
  "UNI-USD":   "uniswap",           "AAVE-USD":  "aave",
  "MKR-USD":   "maker",             "COMP-USD":  "compound",
  "GRT-USD":   "the-graph",         "SNX-USD":   "synthetix",
  "CRV-USD":   "curve",             "BAL-USD":   "balancer",
  "ZRX-USD":   "0x",                "BAT-USD":   "basic-attention-token",
  "ZEC-USD":   "zcash",             "ETC-USD":   "ethereum-classic",
  "XTZ-USD":   "tezos",             "MANA-USD":  "decentraland",
  "ENJ-USD":   "enjin-coin",        "STORJ-USD": "storj",
  "FET-USD":   "fetch-ai",          "ANKR-USD":  "ankr",
  "SKL-USD":   "skale",             "AXS-USD":   "axie-infinity",
  "SAND-USD":  "the-sandbox",       "CHZ-USD":   "chiliz",
  "ICP-USD":   "internet-computer", "FIL-USD":   "filecoin",
  "NEAR-USD":  "near-protocol",     "BCH-USD":   "bitcoin-cash",
  "XLM-USD":   "stellar",           "ALGO-USD":  "algorand",
  "LRC-USD":   "loopring",          "NMR-USD":   "numeraire",
  "SUSHI-USD": "sushi",             "YFI-USD":   "yearn-finance",
  "REN-USD":   "ren",               "OMG-USD":   "omg-network",
  "BAND-USD":  "band-protocol",     "RUNE-USD":  "thorchain",
  "KNC-USD":   "kyber-network",     "GALA-USD":  "gala",
  "MATIC-USD": "polygon",           "1INCH-USD": "1inch",
};

// Stocks Asset List from S&P 500 top 50

const STOCKS_25 = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL",
  "META", "TSLA", "BRK-B", "JPM",  "LLY",
  "AVGO", "UNH",  "XOM",  "V",    "MA",
  "PG",   "JNJ",  "HD",   "ABBV", "KO",
  "PEP",  "BAC",  "COST", "NFLX", "CRM",
];

const STOCKS_50 = [
  ...STOCKS_25,
  "MRK",  "CVX",  "MCD",  "WMT",  "ABT",
  "TMO",  "ACN",  "DHR",  "LIN",  "TXN",
  "NKE",  "ADBE", "VZ",   "CMCSA","QCOM",
  "PM",   "AMD",  "GS",   "CAT",  "NOW",
  "AMGN", "IBM",  "ORCL", "RTX",  "HON",
];

// Dynamic crypto list fetching from CoinGecko
async function fetchDynamicCryptoList(cgPerPage = 250, maxResults = 100) {
  const [cgRes, cbRes] = await Promise.all([
    fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${cgPerPage}&page=1&sparkline=false`,
      { headers: { Accept: "application/json" } }
    ),
    fetch("https://api.exchange.coinbase.com/products"),
  ]);

  if (!cgRes.ok) throw new Error(`CoinGecko returned ${cgRes.status}`);
  if (!cbRes.ok) throw new Error(`Coinbase products returned ${cbRes.status}`);

  const [cgCoins, cbProducts] = await Promise.all([cgRes.json(), cbRes.json()]);

  if (!Array.isArray(cgCoins))    throw new Error("CoinGecko response was not an array");
  if (!Array.isArray(cbProducts)) throw new Error("Coinbase products response was not an array");

  const coinbaseUSDPairs = new Set(
    cbProducts.filter(p => p.quote_currency === "USD").map(p => p.id)
  );

  const list    = [];
  const slugMap = { ...CRYPTO_SLUGS };

  for (const coin of cgCoins) {
    if (list.length >= maxResults) break;
    const sym = `${coin.symbol.toUpperCase()}-USD`;
    if (coinbaseUSDPairs.has(sym) && !STABLECOINS.has(sym)) {
      list.push(sym);
      slugMap[sym] = coin.id; // CoinGecko id matches coinbase.com/price slugs
    }
  }

  console.log(`[dynamic] CoinGecko top ${cgPerPage}: ${cgCoins.length} coins → ${list.length} on Coinbase`);
  return { list, slugMap };
}


app.use(express.static(path.join(__dirname, "../client")));

// Streams one JSON event per asset as it finishes scoring.
// Stock APIs are never called when type=crypto, and vice versa.
app.get("/scores", async (req, res) => {
  const type = req.query.type === "stocks" ? "stocks" : "crypto";

  let symbols;
  let slugMap = CRYPTO_SLUGS;

  if (type === "stocks") {
    const count = parseInt(req.query.count, 10);
    symbols = (!count || count <= 25) ? STOCKS_25 : STOCKS_50;
  } else {
    if (req.query.source === "dynamic") {
      try {
        const dynamic = await fetchDynamicCryptoList(250, 100);
        symbols = dynamic.list;
        slugMap = dynamic.slugMap;
      } catch (err) {
        console.warn("[scores] CoinGecko failed, falling back to CRYPTO_50:", err.message);
        symbols = CRYPTO_50;
      }
    } else {
      const count = parseInt(req.query.count, 10);
      symbols = (!count || count <= 10) ? CRYPTO_10 : CRYPTO_50;
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send   = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  const scorer = type === "stocks" ? scoreAllStocks : scoreAllCryptos;

  console.log(`[scores] type=${type} count=${symbols.length}`);

  scorer(symbols, (result, done, total) => {
    try {
      const enriched = { ...result, type };
      if (type === "crypto") {
        enriched.slug = slugMap[result.symbol] || result.symbol.replace("-USD", "").toLowerCase();
      }
      send(enriched);
      console.log(`[scores] ${done}/${total} — ${result.symbol} score=${result.score?.toFixed(2) ?? "err"}`);
    } catch (err) {
      console.error(`[scores] onProgress error for ${result?.symbol}:`, err.message);
    }
  })
    .then((sorted) => {
      send({ done: true, total: sorted.length });
      res.end();
      console.log("[scores] Scan complete.");
    })
    .catch((err) => {
      send({ error: err.message });
      res.end();
      console.error("[scores] Fatal error:", err);
    });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Stop with Ctrl+C`);
});
