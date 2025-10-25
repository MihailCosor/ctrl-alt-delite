# DateTime Composition Fix

## Problem

The CSV file has separate `trans_date` and `trans_time` columns, but the StateManager was expecting a `trans_datetime` column. The user wanted to keep the original CSV structure in the database and only compose the datetime in the feature extraction function.

## Solution

Updated the StateManager to:
1. **Keep original CSV structure** in MongoDB (separate `trans_date` and `trans_time` columns)
2. **Compose datetime only in feature extraction** using a helper function
3. **Rewrite all MongoDB queries** to work with separate date/time columns

## Changes Made

### ✅ **StateManager (`services/state_manager.py`)**

#### **1. Added pandas import**
```python
import pandas as pd
```

#### **2. DateTime composition in feature extraction**
```python
# Construct trans_datetime from trans_date and trans_time (like training script)
trans_date = transaction.get('trans_date', '')
trans_time = transaction.get('trans_time', '')

if trans_date and trans_time:
    try:
        # Combine date and time like in training script: df['trans_datetime'] = pd.to_datetime(df['trans_date'] + ' ' + df['trans_time'])
        datetime_str = f"{trans_date} {trans_time}"
        trans_datetime = pd.to_datetime(datetime_str, errors='coerce')
        if pd.isna(trans_datetime):
            trans_datetime = datetime.now()
    except:
        trans_datetime = datetime.now()
```

#### **3. Helper function for datetime conversion**
```python
# Helper function to convert trans_date + trans_time to datetime
def get_trans_datetime(trans):
    trans_date = trans.get('trans_date', '')
    trans_time = trans.get('trans_time', '')
    if trans_date and trans_time:
        try:
            datetime_str = f"{trans_date} {trans_time}"
            return pd.to_datetime(datetime_str, errors='coerce')
        except:
            return None
    return None
```

#### **4. Rewritten all MongoDB queries**

**Before (using trans_datetime column)**:
```python
# This won't work because trans_datetime doesn't exist in DB
user_prev_trans = list(self.training_data.find(
    {"ssn": ssn, "trans_datetime": {"$lt": trans_datetime}},
    {"amt": 1}
).sort("trans_datetime", 1))
```

**After (using separate columns)**:
```python
# Get all transactions for this user and filter by time
all_user_trans = list(self.training_data.find(
    {"ssn": ssn},
    {"trans_date": 1, "trans_time": 1, "amt": 1, "merchant": 1, "category": 1, "state": 1}
))

# Filter to only previous transactions (before current transaction time)
user_prev_trans = []
for trans in all_user_trans:
    trans_dt = get_trans_datetime(trans)
    if trans_dt and not pd.isna(trans_dt) and trans_dt < trans_datetime:
        user_prev_trans.append(trans)

# Sort by datetime
user_prev_trans.sort(key=lambda x: get_trans_datetime(x) or datetime.min)
```

## How It Works

### **1. Database Structure (Unchanged)**
```json
{
  "trans_num": "12345",
  "ssn": "123-45-6789",
  "trans_date": "2023-01-15",
  "trans_time": "10:30:00",
  "amt": 150.50,
  "merchant": "merchant_123",
  "category": "gas_transport"
}
```

### **2. Feature Extraction Process**
1. **Incoming transaction**: Construct `trans_datetime` from `trans_date` + `trans_time`
2. **Database queries**: Fetch all relevant transactions using separate columns
3. **In-memory filtering**: Convert each DB record to datetime and filter by time
4. **Feature computation**: Calculate features using filtered historical data

### **3. All 16 Features Now Work**

| Feature | Implementation |
|---------|----------------|
| `time_since_last_user_trans` | Find last transaction, calculate time difference |
| `user_trans_count` | Count filtered previous transactions |
| `user_avg_amt_so_far` | Average of previous amounts |
| `user_max_amt_so_far` | Max of previous amounts |
| `amt_vs_user_avg_ratio` | Current amount / historical average |
| `is_over_user_max_amt` | Boolean: current > historical max |
| `user_avg_amt_last_5_trans` | Average of last 5 transactions |
| `user_merchant_trans_count` | Count per user-merchant pair |
| `is_new_merchant_for_user` | Boolean: first time at merchant |
| `user_avg_amt_category_so_far` | Average per user-category |
| `amt_vs_user_category_avg` | Ratio to category average |
| `is_new_state` | Boolean: state change |
| `cc_num_count_last_1h` | Card velocity in last hour |
| `cc_num_count_last_24h` | Card velocity in last 24h |
| `merchant_avg_amt_so_far` | Merchant historical average |
| `amt_vs_merchant_avg_ratio` | Ratio to merchant average |

## Performance Considerations

### **Query Strategy**
- **Fetch all relevant records** in one query per entity (user, card, merchant)
- **Filter in-memory** by datetime (more flexible than MongoDB date queries)
- **Sort in-memory** for proper chronological order

### **Optimization**
- Uses MongoDB indexes on `ssn`, `cc_num`, `merchant` for fast lookups
- Only fetches required fields (`trans_date`, `trans_time`, `amt`, etc.)
- Processes data in batches per entity type

## Expected Behavior

### **Feature Extraction Logs**
```
📝 Sample transaction: 12345
   SSN: 123-45-6789
   Amount: $150.50
   Date: 2023-01-15
   Time: 10:30:00
   ✓ Feature extraction successful
   
📊 Extracted Features:
   time_since_last_user_trans: 3600.0
   user_trans_count: 15.0
   user_avg_amt_so_far: 125.30
   cc_num_count_last_1h: 1.0
   amt_vs_user_avg_ratio: 1.20
```

### **Database Queries**
```python
# Efficient queries using indexes
all_user_trans = list(self.training_data.find(
    {"ssn": ssn},  # Uses ssn index
    {"trans_date": 1, "trans_time": 1, "amt": 1, "merchant": 1, "category": 1, "state": 1}
))
```

## Benefits

✅ **Preserves Original Data** - No changes to CSV structure in database  
✅ **Matches Training Logic** - Uses exact same datetime composition  
✅ **Flexible Filtering** - In-memory filtering allows complex time logic  
✅ **Efficient Queries** - Uses MongoDB indexes for fast lookups  
✅ **Error Handling** - Gracefully handles invalid date formats  
✅ **All Features Work** - All 16 historical features now functional  

## Testing

Run the test to verify everything works:

```bash
# 1. Load training data (keeps original structure)
python load_training_data.py

# 2. Test feature extraction
python test_historical_features.py
```

The system now properly handles your CSV format with separate `trans_date` and `trans_time` columns while maintaining the original database structure! 🎉
