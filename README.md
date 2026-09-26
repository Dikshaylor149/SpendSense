# SpendSense — Personal Expense & Statistical Analytics Platform

SpendSense is a full-stack financial analytics application built on the **MERN stack (MongoDB, Express.js, React, Node.js)**. Designed from a Business & Data Analytics perspective, it goes beyond basic CRUD expense tracking by implementing **statistical outlier detection (IQR)**, **multi-pipeline MongoDB aggregations (`$facet`)**, **Budget vs. Actual variance tracking**, and a **two-tier deterministic categorization engine**.

---
<img width="1287" height="803" alt="4" src="https://github.com/user-attachments/assets/6ace53a6-b135-486b-8d2b-ef7ec4e214da" />
<img width="1277" height="848" alt="5" src="https://github.com/user-attachments/assets/fdea40bc-48f3-4c58-888c-8502170586ba" />

<img width="1282" height="718" alt="6" src="https://github.com/user-attachments/assets/f6f82909-da2d-4e18-87b0-3bd8f69236f1" />
<img width="1310" height="521" alt="7" src="https://github.com/user-attachments/assets/2aa4da14-a2a4-4138-b335-3531e904319b" />

<img width="1267" height="752" alt="8" src="https://github.com/user-attachments/assets/473eed27-a097-4375-a345-14004fcfd66b" />

## Key Features

- **Unusual Spend Detection:** Automatically flags unusually high transactions using the Interquartile Range (IQR) method and generates a short spending summary using the Gemini API.
- **Spending Analytics:** Tracks total spend, average transaction value, top 5 merchants, and month-over-month spending trends.
- **Smart Auto-Categorization:** Automatically sorts expenses into 8 categories (`Groceries`, `Transport`, `Food`, `Utilities`, `Entertainment`, `Subscriptions`, `EMI`, `Other`) based on your past transactions and common merchant keywords.
- **Budget Tracking:** Lets you set monthly category limits and tracks actual spending with visual progress bars and over-budget alerts.
- **Filter, Edit & CSV Export:** Search by merchant, filter by category or date range, edit records inline, and export filtered data to a CSV file for Excel.

---

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Recharts, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas, Mongoose
- **AI Integration:** Google Gemini API

---

## Local Setup

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
npm install

# Install frontend dependencies
cd ../frontend
npm install
