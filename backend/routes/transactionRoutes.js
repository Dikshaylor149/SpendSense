const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { predictCategory } = require('../services/categorizationService');

// POST: Add a new transaction (with Auto-Categorization support)
router.post('/', async (req, res) => {
  try {
    let { merchant, amount, category, date } = req.body;

    if (!merchant || !amount || !date) {
      return res.status(400).json({ error: 'Please provide merchant, amount, and date' });
    }

    // Trigger auto-categorization if category is set to 'Auto' or omitted
    if (!category || category === 'Auto') {
      category = await predictCategory(merchant);
    }

    const newTransaction = new Transaction({
      merchant,
      amount: Number(amount),
      category,
      date
    });

    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (err) {
    console.error("Error saving transaction:", err);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// GET: Fetch transactions with dynamic MongoDB filtering & sorting
router.get('/', async (req, res) => {
  try {
    const { category, search, startDate, endDate, sort } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.merchant = { $regex: search, $options: 'i' };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    let sortOption = { date: -1 };
    if (sort === 'date_asc') sortOption = { date: 1 };
    if (sort === 'amount_desc') sortOption = { amount: -1 };
    if (sort === 'amount_asc') sortOption = { amount: 1 };

    const transactions = await Transaction.find(query).sort(sortOption);
    res.status(200).json(transactions);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});
// PUT: Update an existing transaction by ID
router.put('/:id', async (req, res) => {
  try {
    const { merchant, amount, category, date } = req.body;

    if (!merchant || !amount || !category || !date) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        merchant: merchant.trim(),
        amount: Number(amount),
        category,
        date
      },
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(updatedTransaction);
  } catch (err) {
    console.error("Error updating transaction:", err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});
// DELETE: Remove a transaction by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedTransaction = await Transaction.findByIdAndDelete(req.params.id);
    
    if (!deletedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
