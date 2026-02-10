
function formatDate(date) {
  return date.toISOString().split("T")[0];
}


function createDates(numValues, daysAgo) {
    const today = new Date();
    const dates = [];
    const interval = daysAgo / (numValues - 1);
    for (let i = 0; i < numValues; i++) {
        const d = new Date(today); // copy today
        d.setDate(today.getDate() - Math.round(i * interval)); // subtract days
        dates.push(d);
    }
    return dates;
}


// Function to fetch the closing price for a given date
async function fetchClosingPrice(date, crypto) {
  const start = formatDate(date);
  const end = formatDate(new Date(date.getTime() + 24 * 60 * 60 * 1000)); // next day
  const url = `https://api.exchange.coinbase.com/products/${crypto}/candles?granularity=86400&start=${start}T00:00:00Z&end=${end}T00:00:00Z`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
      console.log(`No data available for ${start}`);
      return null;
    }

    // Each candle: [time, low, high, open, close, volume]
    const [time, , , , close] = data[0];
    return { date: start, close };
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}


async function createPrices(numValues, daysAgo, crypto = "BTC-USD"){
  const prices = [];
    const dates = createDates(numValues, daysAgo) 
    for (let x = 0; x < dates.length; x++){
        const priceData = await fetchClosingPrice(dates[x], crypto);
        if (priceData) prices.push(priceData);
    }
    return prices;
}

module.exports = {createPrices};
