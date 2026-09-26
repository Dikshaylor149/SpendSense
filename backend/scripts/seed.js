const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Transaction = require('../models/Transaction');

// Load env vars
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedTransactions = [
  // ------------------ PREVIOUS MONTH ------------------
  { merchant: 'Reliance Smart', amount: 3200, category: 'Groceries', date: new Date(new Date().setMonth(new Date().getMonth() - 1, 5)) },
  { merchant: 'Uber', amount: 450, category: 'Transport', date: new Date(new Date().setMonth(new Date().getMonth() - 1, 8)) },
  { merchant: 'Jio', amount: 699, category: 'Utilities', date: new Date(new Date().setMonth(new Date().getMonth() - 1, 10)) },
  { merchant: 'Zomato', amount: 550, category: 'Food', date: new Date(new Date().setMonth(new Date().getMonth() - 1, 15)) },
  { merchant: 'Blinkit', amount: 890, category: 'Groceries', date: new Date(new Date().setMonth(new Date().getMonth() - 1, 20)) },
  { merchant: 'Netflix', amount: 649, category: 'Entertainment', date: new Date(new Date().setMonth(new Date().getMonth() - 1, 22)) },
  
  // ------------------ CURRENT MONTH ------------------
  { merchant: 'Reliance Smart', amount: 3400, category: 'Groceries', date: new Date(new Date().setDate(2)) },
  { merchant: 'Uber', amount: 500, category: 'Transport', date: new Date(new Date().setDate(5)) },
  { merchant: 'Zomato', amount: 420, category: 'Food', date: new Date(new Date().setDate(8)) },
  { merchant: 'Zomato', amount: 600, category: 'Food', date: new Date(new Date().setDate(12)) },
  { merchant: 'Jio', amount: 699, category: 'Utilities', date: new Date(new Date().setDate(15)) },
  { merchant: 'Swiggy', amount: 350, category: 'Food', date: new Date(new Date().setDate(18)) },
  
  // INTENTIONAL ANOMALY: Usually transport is ~500, this is 12,500
  { merchant: 'IndiGo Airlines', amount: 12500, category: 'Transport', date: new Date(new Date().setDate(20)) },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB...');

    // Clear existing data to start fresh
    await Transaction.deleteMany();
    console.log('🗑️ Cleared existing transactions.');

    // Insert seed data
    await Transaction.insertMany(seedTransactions);
    console.log('🌱 Seed data injected successfully!');

    process.exit();
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  }
};

seedDB();