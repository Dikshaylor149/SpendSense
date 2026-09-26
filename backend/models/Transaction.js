const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  merchant: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Groceries', 
      'Transport', 
      'Food', 
      'Utilities', 
      'Entertainment', 
      'Subscriptions', 
      'EMI', 
      'Other'
    ]
  },
  date: {
    type: Date,
    default: Date.now
  },
  isAnomaly: {
    type: Boolean,
    default: false
  },
  aiInsights: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Compound index to optimize filtering by category and sorting by date
transactionSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);