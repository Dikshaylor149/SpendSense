const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// POST /api/budgets - Set or update a category budget (Upsert)
router.post('/', async (req, res) => {
  try {
    const { category, amount } = req.body;
    
    if (!category || amount === undefined) {
      return res.status(400).json({ error: 'Category and amount are required' });
    }

    // findOneAndUpdate with upsert: true creates the record if it doesn't exist, or updates it if it does
    const budget = await Budget.findOneAndUpdate(
      { category },
      { amount: Number(amount) },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(budget);
  } catch (err) {
    console.error("Error saving budget:", err);
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

// GET /api/budgets/status - Merge Budgets (Targets) with Transactions (Actuals)
router.get('/status', async (req, res) => {
  try {
    // 1. Fetch all defined category budgets
    const budgets = await Budget.find();

    // 2. Aggregate actual spending per category from Transactions
    const categorySpending = await Transaction.aggregate([
      {
        $group: {
          _id: "$category",
          actualSpent: { $sum: "$amount" }
        }
      }
    ]);

    // Convert aggregation array into a quick lookup map: { Groceries: 4290, Transport: 13000 }
    const spendingMap = {};
    categorySpending.forEach(item => {
      spendingMap[item._id] = item.actualSpent;
    });

    // 3. Compute variance and utilization metrics
    const budgetStatus = budgets.map(b => {
      const actual = spendingMap[b.category] || 0;
      const utilization = b.amount > 0 ? ((actual / b.amount) * 100).toFixed(1) : 0;
      
      return {
        _id: b._id,
        category: b.category,
        budgetLimit: b.amount,
        actualSpent: actual,
        remaining: b.amount - actual,
        utilizationPercentage: Number(utilization),
        isOverBudget: actual > b.amount
      };
    });

    res.status(200).json(budgetStatus);
  } catch (err) {
    console.error("Error calculating budget status:", err);
    res.status(500).json({ error: 'Failed to calculate budget status' });
  }
});

module.exports = router;