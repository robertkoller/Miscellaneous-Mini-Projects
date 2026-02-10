
const express = require("express");
const path = require("path");
const { scoreCrypto } = require("/Users/robertkoller/CodingProjects/tradingAlgorithm/analyzePrices.js");

const app = express();
const PORT = 3000;

// Serve the HTML file at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Top 50 cryptos list (using Coinbase Pro trading pairs)
const top50 = [
  "BTC-USD", "ETH-USD", "SOL-USD", "ADA-USD", "DOGE-USD", "DOT-USD",
  "AVAX-USD", "MATIC-USD", "LTC-USD", "LINK-USD", "ATOM-USD",
  "XLM-USD" , "ALGO-USD", "AAVE-USD", "MKR-USD", "COMP-USD",
  "UNI-USD", "SUSHI-USD", "YFI-USD", "SNX-USD", "GRT-USD",
  "CRV-USD", "BAL-USD", "REN-USD", "ZRX-USD", "OMG-USD",
  "BAND-USD", "NMR-USD", "REP-USD", "KNC-USD", "LRC-USD",
  "BAT-USD", "ZEC-USD", "DASH-USD", "ETC-USD", "XTZ-USD",
  "MANA-USD", "ENJ-USD", "STORJ-USD", "FET-USD", "ANKR-USD",
  "SKL-USD", "AXS-USD", "SAND-USD", "CHZ-USD", "GALA-USD",
  "ICP-USD", "FIL-USD", "NEAR-USD", "RUNE-USD", "BCH-USD"
];

// API endpoint to get all scores
app.get("/scores", async (req, res) => {
  try {
    console.log("Fetching scores for all cryptos...");
    
    // Fetch all scores in parallel
    const results = await Promise.all(
      top50.map(async (c) => {
        try {
          return await scoreCrypto(c);
        } catch (error) {
          console.error(`Error scoring ${c}:`, error);
          return { crypto: c, score: 0, preStats: null, recentStats: null };
        }
      })
    );

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    console.log("Scores fetched successfully");
    res.json(results);
  } catch (error) {
    console.error("Error in /scores endpoint:", error);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see the rankings`);
});