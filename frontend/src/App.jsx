import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

// Uses live cloud URL when deployed on Vercel, or localhost:5000 on your laptop
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  'Groceries',
  'Transport',
  'Food',
  'Utilities',
  'Entertainment',
  'Subscriptions',
  'EMI',
  'Other'
];

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Analytical States
  const [anomalyInsight, setAnomalyInsight] = useState('');
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [anomalyList, setAnomalyList] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [momTrend, setMomTrend] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [deepDive, setDeepDive] = useState({
    summary: { avgTransaction: 0, maxTransaction: 0, totalTransactions: 0, totalSpent: 0 },
    topMerchants: [],
    monthlyTrend: []
  });

  // Filter & Sort State for Transactions Table
  const [filters, setFilters] = useState({
    search: '',
    category: 'All',
    startDate: '',
    endDate: '',
    sort: 'date_desc'
  });

  // Transaction Form State
  const [formData, setFormData] = useState({
    merchant: '',
    amount: '',
    category: 'Auto',
    date: new Date().toISOString().split('T')[0]
  });

  // Budget Form State
  const [budgetForm, setBudgetForm] = useState({
    category: 'Groceries',
    amount: ''
  });

  // Inline Edit State
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    merchant: '',
    amount: '',
    category: 'Groceries',
    date: ''
  });

  // 1. Fetch Global Analytics & Budgets
  const fetchAnalytics = async () => {
    try {
      const [anomalyRes, categoryRes, trendRes, budgetRes, deepDiveRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/analytics/anomalies`),
        axios.get(`${API_BASE_URL}/api/analytics/category-spending`),
        axios.get(`${API_BASE_URL}/api/analytics/mom-trend`),
        axios.get(`${API_BASE_URL}/api/budgets/status`),
        axios.get(`${API_BASE_URL}/api/analytics/deep-dive`)
      ]);
      setAnomalyInsight(anomalyRes.data.insight);
      setAnomalyCount(anomalyRes.data.anomalyCount);
      setAnomalyList(anomalyRes.data.data || []);
      setCategoryData(categoryRes.data);
      setMomTrend(trendRes.data);
      setBudgets(budgetRes.data);
      setDeepDive(deepDiveRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // 2. Fetch Filtered Transactions
  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category !== 'All') params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.sort) params.append('sort', filters.sort);

      const txRes = await axios.get(`${API_BASE_URL}/api/transactions?${params.toString()}`);
      setTransactions(txRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: 'All',
      startDate: '',
      endDate: '',
      sort: 'date_desc'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/transactions`, {
        ...formData,
        amount: Number(formData.amount)
      });

      setFormData({
        merchant: '',
        amount: '',
        category: 'Auto',
        date: new Date().toISOString().split('T')[0]
      });

      fetchTransactions();
      fetchAnalytics();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/budgets`, {
        category: budgetForm.category,
        amount: Number(budgetForm.amount)
      });
      setBudgetForm((prev) => ({ ...prev, amount: '' }));
      fetchAnalytics();
    } catch (error) {
      console.error('Error setting budget:', error);
    }
  };

  // Start Inline Editing
  const startEditing = (tx) => {
    setEditingId(tx._id);
    setEditFormData({
      merchant: tx.merchant,
      amount: tx.amount,
      category: tx.category,
      date: new Date(tx.date).toISOString().split('T')[0]
    });
  };

  // Save Edited Transaction
  const handleEditSave = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/transactions/${id}`, {
        ...editFormData,
        amount: Number(editFormData.amount)
      });
      setEditingId(null);
      fetchTransactions();
      fetchAnalytics();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/transactions/${id}`);
      fetchTransactions();
      fetchAnalytics();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  // Helper to check if a transaction is flagged as an IQR outlier
  const isTxAnomaly = (tx) => {
    if (tx.isAnomaly) return true;
    return anomalyList.some((a) => a._id === tx._id);
  };

  // Export currently filtered transactions to CSV
  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = ['Date', 'Merchant', 'Category', 'Amount (INR)', 'IQR Outlier'];
    const rows = transactions.map((tx) => {
      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      const safeMerchant = `"${tx.merchant.replace(/"/g, '""')}"`;
      const outlierFlag = isTxAnomaly(tx) ? 'Yes' : 'No';
      return [dateStr, safeMerchant, tx.category, tx.amount, outlierFlag].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `spendsense_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const overBudgetList = budgets.filter((b) => b.isOverBudget);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header & Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">SpendSense</h1>
            <p className="text-xs text-slate-500">Personal Expense & Statistical Analytics Platform</p>
          </div>
          <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'transactions', label: 'Transactions' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'budgets', label: 'Budgets' },
              { id: 'insights', label: 'Insights' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ==================== 1. OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Spending</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">
                    ₹{deepDive.summary.totalSpent.toLocaleString()}
                  </p>
                  {momTrend && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        momTrend.trend === 'up' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {momTrend.trend === 'up' ? '↑' : '↓'} {Math.abs(momTrend.percentageChange)}% MoM
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">Across {deepDive.summary.totalTransactions} transactions</p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Avg Transaction</p>
                <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                  ₹{deepDive.summary.avgTransaction.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Max single spend: ₹{deepDive.summary.maxTransaction.toLocaleString()}
                </p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Top Category</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {categoryData[0]?._id || '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {categoryData[0] ? `₹${categoryData[0].totalAmount.toLocaleString()} total` : 'No data'}
                </p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Budget & Anomalies</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-bold text-amber-600 tabular-nums">{anomalyCount} Outliers</p>
                  <span className="text-xs font-medium text-slate-500">
                    {overBudgetList.length} Over Budget
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Flagged via IQR baseline</p>
              </div>
            </div>

            {/* Key Insights Strip */}
            {anomalyInsight && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                    Key Analytical Finding
                  </span>
                  <p className="text-sm text-amber-900 mt-0.5">{anomalyInsight}</p>
                </div>
                <button
                  onClick={() => setActiveTab('insights')}
                  className="text-xs font-semibold text-amber-900 underline shrink-0"
                >
                  View Full Report →
                </button>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-white border border-slate-200 rounded-lg">
                <h2 className="text-base font-semibold text-slate-800 mb-4">Spending by Category</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: '#F8FAFC' }}
                        contentStyle={{ borderRadius: '6px', border: '1px solid #E2E8F0' }}
                      />
                      <Bar dataKey="totalAmount" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-white border border-slate-200 rounded-lg">
                <h2 className="text-base font-semibold text-slate-800 mb-4">Monthly Spending Trend</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={deepDive.monthlyTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                      <Line
                        type="monotone"
                        dataKey="totalSpent"
                        stroke="#0F172A"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0F172A' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. TRANSACTIONS TAB ==================== */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Add Transaction Form */}
            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Log New Expense</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Merchant</label>
                  <input
                    type="text"
                    name="merchant"
                    value={formData.merchant}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Zee5, Uber, Indigo..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Auto">✨ Auto-Detect</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white text-sm font-medium p-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Add Expense
                </button>
              </form>
            </div>

            {/* Search, Filter, Sort & Export Controls */}
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Filter & Query Database
                  </h2>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    {transactions.length} records
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={resetFilters}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={exportToCSV}
                    disabled={transactions.length === 0}
                    className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  >
                    ↓ Export CSV
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search merchant..."
                  className="p-2 text-sm border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="p-2 text-sm border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="p-2 text-sm border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="p-2 text-sm border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="sort"
                  value={filters.sort}
                  onChange={handleFilterChange}
                  className="p-2 text-sm border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="amount_desc">Amount: High to Low</option>
                  <option value="amount_asc">Amount: Low to High</option>
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {loading ? (
                <p className="p-6 text-slate-500 text-sm">Loading database records...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="p-3.5 font-semibold">Date</th>
                        <th className="p-3.5 font-semibold">Merchant</th>
                        <th className="p-3.5 font-semibold">Category</th>
                        <th className="p-3.5 font-semibold text-right">Amount (₹)</th>
                        <th className="p-3.5 font-semibold text-center">IQR Status</th>
                        <th className="p-3.5 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700 divide-y divide-slate-200">
                      {transactions.map((tx) => {
                        const outlier = isTxAnomaly(tx);
                        const isEditing = editingId === tx._id;

                        return (
                          <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                            {isEditing ? (
                              <>
                                <td className="p-2.5">
                                  <input
                                    type="date"
                                    value={editFormData.date}
                                    onChange={(e) =>
                                      setEditFormData((prev) => ({ ...prev, date: e.target.value }))
                                    }
                                    className="p-1.5 text-xs border border-slate-300 rounded w-full"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={editFormData.merchant}
                                    onChange={(e) =>
                                      setEditFormData((prev) => ({ ...prev, merchant: e.target.value }))
                                    }
                                    className="p-1.5 text-xs border border-slate-300 rounded w-full"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <select
                                    value={editFormData.category}
                                    onChange={(e) =>
                                      setEditFormData((prev) => ({ ...prev, category: e.target.value }))
                                    }
                                    className="p-1.5 text-xs border border-slate-300 rounded bg-white w-full"
                                  >
                                    {CATEGORIES.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="number"
                                    value={editFormData.amount}
                                    onChange={(e) =>
                                      setEditFormData((prev) => ({ ...prev, amount: e.target.value }))
                                    }
                                    className="p-1.5 text-xs border border-slate-300 rounded w-24 text-right ml-auto block"
                                  />
                                </td>
                                <td className="p-2.5 text-center text-xs text-slate-400">Editing...</td>
                                <td className="p-2.5 text-center space-x-2">
                                  <button
                                    onClick={() => handleEditSave(tx._id)}
                                    className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="text-slate-500 hover:text-slate-700 text-xs font-medium"
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3.5 tabular-nums">{new Date(tx.date).toLocaleDateString()}</td>
                                <td className="p-3.5 font-medium text-slate-900">{tx.merchant}</td>
                                <td className="p-3.5">
                                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                    {tx.category}
                                  </span>
                                </td>
                                <td className="p-3.5 font-semibold text-slate-900 text-right tabular-nums">
                                  ₹{tx.amount.toLocaleString()}
                                </td>
                                <td className="p-3.5 text-center">
                                  {outlier ? (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                                      Outlier
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="p-3.5 text-center space-x-3">
                                  <button
                                    onClick={() => startEditing(tx)}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(tx._id)}
                                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-slate-500">
                            No matching transactions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 3. ANALYTICS TAB ==================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium uppercase">Current vs Previous Month</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Current Month</p>
                    <p className="text-xl font-bold text-slate-900 tabular-nums">
                      ₹{momTrend?.currentMonth?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Previous Month</p>
                    <p className="text-xl font-semibold text-slate-600 tabular-nums">
                      ₹{momTrend?.previousMonth?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium uppercase">Average Ticket Value</p>
                <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                  ₹{deepDive.summary.avgTransaction.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Per transaction across all categories</p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium uppercase">Peak Single Expense</p>
                <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                  ₹{deepDive.summary.maxTransaction.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Highest individual transaction recorded</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <h2 className="text-base font-semibold text-slate-800 mb-1">Top Merchants by Spend</h2>
                <p className="text-xs text-slate-500 mb-4">Aggregated via MongoDB $facet pipeline</p>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                      <th className="py-2 font-semibold">Merchant</th>
                      <th className="py-2 font-semibold text-center">Visits</th>
                      <th className="py-2 font-semibold text-right">Avg Spend</th>
                      <th className="py-2 font-semibold text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deepDive.topMerchants.map((m) => (
                      <tr key={m.merchant}>
                        <td className="py-2.5 font-medium text-slate-900">
                          {m.merchant}
                          <span className="ml-2 text-xs text-slate-400 font-normal">({m.category})</span>
                        </td>
                        <td className="py-2.5 text-center tabular-nums text-slate-600">{m.visitCount}</td>
                        <td className="py-2.5 text-right tabular-nums text-slate-600">
                          ₹{m.avgSpent.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                          ₹{m.totalSpent.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <h2 className="text-base font-semibold text-slate-800 mb-1">Category Spending Share</h2>
                <p className="text-xs text-slate-500 mb-4">Proportional distribution of total expenditure</p>
                <div className="space-y-3">
                  {categoryData.map((cat) => {
                    const share =
                      deepDive.summary.totalSpent > 0
                        ? ((cat.totalAmount / deepDive.summary.totalSpent) * 100).toFixed(1)
                        : 0;
                    return (
                      <div key={cat._id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{cat._id}</span>
                          <span className="tabular-nums text-slate-600">
                            ₹{cat.totalAmount.toLocaleString()} ({share}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 4. BUDGETS TAB ==================== */}
        {activeTab === 'budgets' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Category Budget Controls</h2>
                <p className="text-xs text-slate-500">
                  Set monthly targets to track actual expenditure vs. planned thresholds
                </p>
              </div>
              <form onSubmit={handleBudgetSubmit} className="flex gap-2 items-center">
                <select
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="p-2 text-sm border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Limit (₹)"
                  value={budgetForm.amount}
                  onChange={(e) => setBudgetForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  min="1"
                  className="w-32 p-2 text-sm border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-800 transition-colors"
                >
                  Set Target
                </button>
              </form>
            </div>

            {budgets.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No category budgets configured yet. Set a limit above to begin tracking variance.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgets.map((b) => {
                  const barWidth = Math.min(b.utilizationPercentage, 100);
                  const barColor = b.isOverBudget
                    ? 'bg-red-600'
                    : b.utilizationPercentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-600';

                  return (
                    <div key={b._id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-slate-800 text-sm">{b.category}</span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            b.isOverBudget ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {b.utilizationPercentage}% Used
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                        <span>Actual: ₹{b.actualSpent.toLocaleString()}</span>
                        <span>Target: ₹{b.budgetLimit.toLocaleString()}</span>
                      </div>
                      {b.isOverBudget && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          Over budget by ₹{Math.abs(b.remaining).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== 5. INSIGHTS TAB ==================== */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded uppercase tracking-wider">
                AI Spending Observation
              </span>
              <h2 className="text-base font-semibold text-slate-900 mt-3">Executive Spending Summary</h2>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                {anomalyInsight || 'Sufficient transaction history required to generate insights.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">
                  Month-over-Month Velocity
                </h3>
                {momTrend ? (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Current month spending is{' '}
                    <strong className="text-slate-900">₹{momTrend.currentMonth.toLocaleString()}</strong> compared
                    to <strong className="text-slate-900">₹{momTrend.previousMonth.toLocaleString()}</strong> in
                    the previous period — representing a{' '}
                    <strong className={momTrend.trend === 'up' ? 'text-red-600' : 'text-emerald-600'}>
                      {Math.abs(momTrend.percentageChange)}% {momTrend.trend === 'up' ? 'increase' : 'decrease'}
                    </strong>
                    .
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No trend data available.</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">
                  Budget Compliance Status
                </h3>
                {overBudgetList.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-600">
                    {overBudgetList.map((b) => (
                      <li key={b._id} className="flex items-center justify-between">
                        <span>
                          <strong className="text-slate-900">{b.category}</strong> exceeded target by ₹
                          {Math.abs(b.remaining).toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-red-600">{b.utilizationPercentage}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-emerald-700">
                    All monitored categories are currently within their target budget thresholds.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                Flagged Unusual Transactions (IQR Method)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Transactions exceeding the statistical upper fence (Q3 + 1.5 × IQR)
              </p>
              {anomalyList.length === 0 ? (
                <p className="text-sm text-slate-500">No statistical outliers detected in current dataset.</p>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                      <th className="py-2 font-semibold">Date</th>
                      <th className="py-2 font-semibold">Merchant</th>
                      <th className="py-2 font-semibold">Category</th>
                      <th className="py-2 font-semibold text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {anomalyList.map((tx) => (
                      <tr key={tx._id}>
                        <td className="py-2.5 tabular-nums text-slate-600">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-medium text-slate-900">{tx.merchant}</td>
                        <td className="py-2.5 text-slate-600">{tx.category}</td>
                        <td className="py-2.5 text-right font-bold text-amber-700 tabular-nums">
                          ₹{tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;