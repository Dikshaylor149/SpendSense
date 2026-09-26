# SpendSense — Personal Expense & Statistical Analytics Platform

SpendSense is a full-stack financial analytics application built on the **MERN stack (MongoDB, Express.js, React, Node.js)**. Designed from a Business & Data Analytics perspective, it goes beyond basic CRUD expense tracking by implementing **statistical outlier detection (IQR)**, **multi-pipeline MongoDB aggregations (`$facet`)**, **Budget vs. Actual variance tracking**, and a **two-tier deterministic categorization engine**.

---

## Key Analytical & Architectural Features

### 1. Statistical Anomaly Detection (Interquartile Range - IQR)
Rather than relying on arbitrary static thresholds, SpendSense dynamically computes the distribution of historical transactions to flag unusual spending spikes:
- Calculates $Q_1$ (25th percentile), $Q_3$ (75th percentile), and $\text{IQR} = Q_3 - Q_1$.
- Establishes a dynamic statistical upper fence: $\text{Upper Fence} = Q_3 + 1.5 \times \text{IQR}$.
- Synthesizes flagged anomalies into plain-English executive summaries via Google Gemini API, backed by a deterministic programmatic fallback to guarantee 100% uptime under API rate limits.

### 2. Single-Pass Multi-Dimensional Aggregation (`$facet`)
To minimize database round-trips, the `/api/analytics/deep-dive` endpoint leverages MongoDB's `$facet` operator to execute three analytical pipelines in parallel within a single query:
- **Summary KPIs:** Total expenditure, transaction volume, average ticket value (`$avg`), and peak single expense (`$max`).
- **Merchant Concentration:** Top 5 merchants ranked by total spend, visit frequency, and average spend per visit.
- **Chronological Velocity:** Month-over-Month (MoM) time-series aggregation and percentage variance calculation.

### 3. Two-Tier Automated Expense Categorization (Human-in-the-Loop)
When logging expenses under `✨ Auto-Detect`, the backend classifies merchants with zero external API latency across 8 domain categories (`Groceries`, `Transport`, `Food`, `Utilities`, `Entertainment`, `Subscriptions`, `EMI`, `Other`):
- **Tier 1 (Historical Memory):** Queries MongoDB for the most recent category assigned to that exact merchant. Editing a transaction inline (`PUT`) retrains future predictions automatically.
- **Tier 2 (Word-Boundary Regex Tokenization):** Applies `\b` regex word-boundary matching against a curated dictionary of 150+ Indian merchants and financial keywords to prevent substring false positives (e.g., distinguishing `"Vi"` in Telecom from `"Movie"` in Entertainment).

### 4. Budget vs. Actuals Variance Engine
- Stores category targets in a dedicated `Budget` collection using atomic `upsert` operations.
- Merges targets against real-time aggregated actuals from the `Transaction` collection to compute utilization percentages, remaining balances, and over-budget breach alerts.

### 5. Database Indexing & Dynamic Querying + CSV Export
- Optimizes server-side filtering (`$regex`, `$gte`, `$lte`) and sorting using a compound MongoDB index on `{ category: 1, date: -1 }`.
- Supports 1-click client-side **CSV export** of any filtered transaction slice for downstream analysis in Excel or Python.

---

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Recharts, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas, Mongoose ODM (Compound Indexing & Aggregation Pipelines)
- **AI Synthesis:** Google Gemini API (`@google/generative-ai`) with deterministic fallback

---

## Local Setup Instructions

### 1. Clone & Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install