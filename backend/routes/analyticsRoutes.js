const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { detectAnomaliesIQR } = require('../services/anomalyService');
const { generateAnomalyInsight } = require('../services/aiService');

// GET /api/analytics/category-spending
router.get('/category-spending', async (req, res) => {
  try {
    const categoryData = await Transaction.aggregate([
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);
    res.status(200).json(categoryData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate category analytics' });
  }
});

// GET /api/analytics/anomalies
router.get('/anomalies', async (req, res) => {
  try {
    const transactions = await Transaction.find(); 
    const anomalies = detectAnomaliesIQR(transactions); 
    const aiInsight = await generateAnomalyInsight(anomalies);
    
    // Return both the raw data and the AI translation
    res.status(200).json({
      anomalyCount: anomalies.length,
      insight: aiInsight,
      data: anomalies
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run anomaly detection' });
  }
});
// GET /api/analytics/mom-trend
router.get('/mom-trend', async (req, res) => {
  try {
    const trendData = await Transaction.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          totalSpent: { $sum: "$amount" }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 } // Sort newest months first
      },
      {
        $limit: 2 // We only need the current month and the previous month
      }
    ]);

    // If there is no data at all
    if (trendData.length === 0) {
      return res.status(200).json({ currentMonth: 0, previousMonth: 0, percentageChange: 0, trend: 'neutral' });
    }

    // If there is only one month of data, we can't calculate a past trend
    if (trendData.length === 1) {
      return res.status(200).json({ 
        currentMonth: trendData[0].totalSpent, 
        previousMonth: 0, 
        percentageChange: 0, 
        trend: 'neutral' 
      });
    }

    const currentMonth = trendData[0].totalSpent;
    const previousMonth = trendData[1].totalSpent;
    
    // Calculate the percentage change
    const percentageChange = (((currentMonth - previousMonth) / previousMonth) * 100).toFixed(1);
    const trend = currentMonth > previousMonth ? 'up' : 'down';

    res.status(200).json({
      currentMonth,
      previousMonth,
      percentageChange: Number(percentageChange),
      trend
    });
  } catch (err) {
    console.error("Error calculating MoM trend:", err);
    res.status(500).json({ error: 'Failed to calculate MoM trend' });
  }
});

// GET /api/analytics/deep-dive
// Uses MongoDB $facet to compute Summary Stats, Top Merchants, and Monthly Trends in a single query
router.get('/deep-dive', async (req, res) => {
  try {
    const results = await Transaction.aggregate([
      {
        $facet: {
          // Pipeline 1: Overall Summary Statistics
          summaryStats: [
            {
              $group: {
                _id: null,
                avgTransaction: { $avg: "$amount" },
                maxTransaction: { $max: "$amount" },
                totalTransactions: { $sum: 1 },
                totalSpent: { $sum: "$amount" }
              }
            }
          ],
          // Pipeline 2: Top 5 Merchants by Spend & Frequency
          topMerchants: [
            {
              $group: {
                _id: "$merchant",
                totalSpent: { $sum: "$amount" },
                visitCount: { $sum: 1 },
                avgSpent: { $avg: "$amount" },
                category: { $first: "$category" }
              }
            },
            { $sort: { totalSpent: -1 } },             {$limit: 5 }
          ],
          // Pipeline 3: Monthly Spending Trend (Chronological)
          monthlyTrend: [
            {
              $group: {
                _id: {
                  year: { $year: "$date" },
                  month: { $month: "$date" }
                },
                totalSpent: { $sum: "$amount" },
                txCount: { $sum: 1 }               }             },             {$sort: { "_id.year": 1, "_id.month": 1 } }
          ]
        }
      }
    ]);

    const data = results[0];
    const summary = data.summaryStats[0] || {
      avgTransaction: 0,
      maxTransaction: 0,
      totalTransactions: 0,
      totalSpent: 0
    };

    // Format monthly trend labels (e.g., "Aug 2026", "Sep 2026")
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedMonthlyTrend = data.monthlyTrend.map(item => ({
      monthLabel: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      totalSpent: item.totalSpent,
      txCount: item.txCount
    }));

    res.status(200).json({
      summary: {
        avgTransaction: Math.round(summary.avgTransaction),
        maxTransaction: summary.maxTransaction,
        totalTransactions: summary.totalTransactions,
        totalSpent: summary.totalSpent
      },
      topMerchants: data.topMerchants.map(m => ({
        merchant: m._id,
        totalSpent: m.totalSpent,
        visitCount: m.visitCount,
        avgSpent: Math.round(m.avgSpent),
        category: m.category
      })),
      monthlyTrend: formattedMonthlyTrend
    });
  } catch (err) {
    console.error("Error in deep-dive analytics:", err);
    res.status(500).json({ error: 'Failed to fetch deep-dive analytics' });
  }
});
module.exports = router;
