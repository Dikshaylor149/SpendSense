// backend/services/anomalyService.js

const detectAnomaliesIQR = (transactions) => {
  // If we don't have enough data to find a trend, return empty
  if (transactions.length < 4) return [];

  // 1. Extract and sort all transaction amounts from lowest to highest
  const amounts = transactions.map(t => t.amount).sort((a, b) => a - b);

  // 2. Find Q1 (25th percentile) and Q3 (75th percentile)
  const q1Index = Math.floor(amounts.length * 0.25);
  const q3Index = Math.floor(amounts.length * 0.75);
  const q1 = amounts[q1Index];
  const q3 = amounts[q3Index];

  // 3. Calculate the Interquartile Range (IQR) and the Upper Threshold
  const iqr = q3 - q1;
  const upperBound = q3 + (1.5 * iqr); // Standard statistical formula for outliers

  // 4. Return only the transactions that exceed the upper threshold
  return transactions.filter(t => t.amount > upperBound);
};

module.exports = { detectAnomaliesIQR };