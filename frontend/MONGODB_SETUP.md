# MongoDB Integration Setup

This document explains how the Next.js frontend is configured to connect directly to MongoDB for real-time transaction monitoring.

## Overview

The frontend now connects directly to MongoDB to display real-time transaction data that's being processed by the backend fraud detection system. Data refreshes every second to show the latest transactions and statistics.

## Architecture

```
Backend (FastAPI) → MongoDB → Frontend (Next.js)
     ↓                ↓           ↓
  Stream Handler   Collections   Real-time Dashboard
  (SSE Client)     (transactions) (Auto-refresh)
```

## Files Created/Modified

### 1. MongoDB Connection (`src/lib/mongodb.js`)
- Establishes connection to MongoDB using the official MongoDB driver
- Implements connection pooling for development and production
- Provides helper functions for database and collection access

### 2. API Routes
- `src/app/api/transactions/route.js` - Get paginated transactions
- `src/app/api/transactions/latest/route.js` - Get latest transactions
- `src/app/api/transactions/stats/route.js` - Get transaction statistics

### 3. Real-time Hook (`src/hooks/use-realtime-transactions.js`)
- Custom React hook that fetches data every second
- Manages loading states and error handling
- Provides refetch functionality

### 4. Dashboard Component (`src/components/transaction-dashboard.jsx`)
- Displays real-time transaction statistics
- Shows recent transactions with fraud classification
- Auto-refreshes every second

### 5. Updated Main Page (`src/app/page.js`)
- Replaced default Next.js content with transaction dashboard
- Clean, professional interface for monitoring

## Environment Configuration

Create a `.env.local` file in the frontend directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
```

## Database Schema

The system expects the following MongoDB collections:

### `transactions` Collection
```javascript
{
  _id: ObjectId,
  transaction: {
    trans_num: String,
    ssn: String,
    cc_num: String,
    merchant: String,
    category: String,
    amt: Number,
    state: String,
    trans_date: String,
    trans_time: String,
    unix_time: Number
  },
  classification: Number, // 0 = legitimate, 1 = fraud
  processed_at: Date
}
```

## Features

### Real-time Updates
- Data refreshes every second automatically
- Shows latest 20 transactions
- Displays current statistics

### Statistics Dashboard
- Total transaction count
- Fraud rate percentage
- Recent activity (last hour)
- Last update timestamp

### Transaction Display
- Fraud/legitimate classification with color coding
- Transaction details (merchant, amount, category)
- Masked SSN for privacy
- Processing timestamps

## Usage

1. Ensure MongoDB is running on `localhost:27017`
2. Start the backend to populate transaction data
3. Start the frontend: `npm run dev`
4. Visit `http://localhost:3000` to see the dashboard

## Dependencies Added

- `mongodb` - Official MongoDB driver for Node.js

## Performance Considerations

- Connection pooling is implemented for efficient database access
- Queries are optimized with proper indexing
- Real-time updates are throttled to 1-second intervals
- Error handling prevents crashes from database issues

## Security Notes

- SSNs are masked in the UI for privacy
- Database connection uses environment variables
- No sensitive data is exposed in client-side code

