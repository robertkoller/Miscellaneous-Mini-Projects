const {createPrices} = require("/Users/robertkoller/CodingProjects/MiscMiniProj/tradingAlgorithm/getPrices.js");

async function scoreCrypto(crypto = "BTC-USD") {
  // Fetch prices (example: 1 year + 3 weeks)
  const yearPrices = await createPrices(100, 365, crypto);
  const threeWeeksPrices = await createPrices(21, 21, crypto);


  const preStats = linearRegression(yearPrices);
  const recentStats = linearRegression(threeWeeksPrices);

  let score = 0;

  // Decreasing trend in last year (before last 3 weeks)
  if (preStats.slope < 0) {
    score += Math.abs(preStats.slope) * preStats.r * 50; // bigger negative slope = higher score
  }

  // Increasing trend in last 3 weeks
  if (recentStats.slope > 0) {
    score += recentStats.slope * recentStats.r * 50; // bigger positive slope = higher score
  }

  return { crypto, score, preStats, recentStats };
}

// Linear regression (slope and correlation)
function linearRegression(data) {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i].close;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const r = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  return { slope, r };
}

// Example usage
async function main(){
  const result = await scoreCrypto("IP-USD");
  console.log(result);
  console.log("asdf");
}
main();
module.exports = { scoreCrypto };
