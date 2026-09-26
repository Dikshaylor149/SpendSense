const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true // Ensures we don't accidentally create multiple budgets for the same category
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Budget', budgetSchema);