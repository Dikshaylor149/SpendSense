const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from .env
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected successfully!'))
  .catch((err) => console.log('❌ MongoDB connection error:', err));

// Health-check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'SpendSense API is running locally!' });
});

// Import and use routes
const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api/transactions', transactionRoutes);

const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/analytics', analyticsRoutes);

const budgetRoutes = require('./routes/budgetRoutes');
app.use('/api/budgets', budgetRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});