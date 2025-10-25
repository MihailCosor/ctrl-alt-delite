# Transaction Classifier API

FastAPI backend for processing and classifying transaction streams using machine learning with **stateful feature engineering**.

## Features

- ✅ Real-time SSE stream processing with concurrent handling (100+ transactions)
- ✅ XGBoost-based fraud detection model with stateful features
- ✅ **MongoDB-based state management** for historical transaction patterns
- ✅ **Target encoding** from training artifacts for categorical features
- ✅ Threading architecture for high performance (100 worker threads)
- ✅ Automatic error handling and recovery
- ✅ CORS middleware support
- ✅ Health monitoring and statistics

## 🆕 State Management System

The model was trained on **stateful features** that require transaction history. This system uses MongoDB as a persistent feature store to maintain:

- **Card velocity**: Transaction counts in rolling time windows (15min, 1hr, 24hr)
- **User patterns**: Expanding averages, maximums, transaction counts per SSN
- **Time deltas**: Seconds since last transaction for cards and users
- **Entity relationships**: Unique cards per account/merchant
- **Target encodings**: Historical fraud rates for merchants, cities, states, accounts, SSNs

See [STATE_MANAGEMENT_ARCHITECTURE.md](STATE_MANAGEMENT_ARCHITECTURE.md) for detailed architecture documentation.

## Project Structure

```
backend/
├── main.py                          # FastAPI application entry point
├── requirements.txt                 # Python dependencies
├── services/
│   ├── __init__.py                 # Service exports
│   ├── stream_handler.py           # SSE stream processing with threading
│   ├── classifier.py               # ML model wrapper with state integration
│   └── state_manager.py            # MongoDB state management (NEW)
├── classifiers/
│   ├── model_corina_1.0.joblib     # Trained XGBoost model
│   ├── corina_1.0.py               # Training script (reference)
│   ├── generate_encodings.py       # Script to generate target encodings (NEW)
│   └── encodings/                  # Target encoding artifacts (NEW)
│       ├── merchant_encoding.joblib
│       ├── city_encoding.joblib
│       ├── state_encoding.joblib
│       ├── acct_num_encoding.joblib
│       └── ssn_encoding.joblib
├── test_state_manager.py           # Test suite for state management (NEW)
├── STATE_MANAGEMENT_ARCHITECTURE.md # Detailed architecture docs (NEW)
├── SETUP_GUIDE.md                  # Complete setup instructions (NEW)
├── THREADING_ARCHITECTURE.md       # Threading model documentation
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the backend root:

```env
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017

# Stream API Configuration
API_KEY=your_api_key_here
STREAM_URL=https://95.217.75.14:8443/stream
FLAG_URL=https://95.217.75.14:8443/api/flag

# SSL Verification (set to 'true' for production, 'false' for dev/self-signed certs)
VERIFY_SSL=false

# Threading Settings (optional)
MAX_CONCURRENT_TASKS=100  # Number of worker threads
```

### 3. Start MongoDB (if running locally)

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use your existing MongoDB instance
```

### 4. Generate Target Encoding Maps

**Important**: Generate target encoding maps from your training data and save them to MongoDB:

```bash
python classifiers/generate_encodings.py /path/to/training_data.csv
```

This saves encoding maps directly to MongoDB that map categorical values to historical fraud rates.

**Note**: If you skip this step, the system will use default values (global fraud mean), which reduces accuracy but allows the system to run.

### 5. Test State Management (Optional but Recommended)

```bash
python test_state_manager.py
```

Verify all tests pass before starting the service.

### 6. Run the Server

```bash
./start.sh
# or
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### 7. Verify State is Building

After processing transactions, check state growth:

```bash
python test_state_manager.py --check-state
```

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root endpoint - API status |
| `GET` | `/health` | Health check and database connectivity |
| `GET` | `/stats` | Transaction processing statistics |
| `GET` | `/docs` | Interactive API documentation (Swagger UI) |

## Architecture

### Threading Model

The stream handler uses Python threading for concurrent processing:
- ThreadPoolExecutor with 100 worker threads (configurable)
- Single SSE stream handler thread (blocking, synchronous)
- Fire-and-forget daemon threads for API flagging
- Synchronous MongoDB operations (thread-safe)
- Can handle 700-1400 transactions/second with 100 workers

See [THREADING_ARCHITECTURE.md](THREADING_ARCHITECTURE.md) for details.

### State Management

MongoDB serves as a persistent **feature store** with 4 collections:

1. **card_state**: Card-level velocity and transaction history
2. **user_state**: User (SSN) level patterns and averages
3. **account_state**: Account-to-card associations
4. **merchant_state**: Merchant-to-card associations

**Performance**:
- Single `find_one` per entity (< 5ms per transaction)
- Indexed lookups on all collections
- Atomic updates using `update_one` and `$addToSet`
- No raw transaction log queries (critical for performance)

See [STATE_MANAGEMENT_ARCHITECTURE.md](STATE_MANAGEMENT_ARCHITECTURE.md) for detailed design.

### ML Model Integration

- Model loaded once at startup for optimal performance
- XGBoost classifier trained on **stateful features**
- State manager computes features from MongoDB state
- Target encodings loaded from `.joblib` files (in-memory cache)
- Prediction threshold: 0.80 (optimized for high precision)
- Fallback to safe classification (0) if model fails

### Data Flow

```
Transaction arrives (SSE)
    ↓
Submit to ThreadPoolExecutor
    ↓
[Worker Thread]
    ├─→ 1. Read state from MongoDB (card, user, account, merchant)
    ├─→ 2. Compute stateful features
    ├─→ 3. Classify with ML model
    ├─→ 4. Flag transaction (fire-and-forget daemon thread)
    ├─→ 5. Save to MongoDB (transactions collection)
    └─→ 6. Update state in MongoDB (for next transaction)
```

## Configuration

### Threading Tuning

Adjust `MAX_CONCURRENT_TASKS` based on your server capacity:
- **Low (50)**: Limited resources, stable connection
- **Medium (100)**: Default, good balance
- **High (200+)**: Powerful server, high throughput

Note: With threading, memory per task is ~8MB vs ~1KB for async, so 100-200 threads is optimal for most systems.

### SSL Configuration

- **Development**: `VERIFY_SSL=false` (bypass self-signed cert errors)
- **Production**: `VERIFY_SSL=true` (verify certificates)

## Monitoring

### Application Health

```bash
curl http://localhost:8000/health
```

### Processing Statistics

```bash
curl http://localhost:8000/stats
```

### State Growth

Check how many entities are being tracked:

```bash
python test_state_manager.py --check-state
```

Output:
```
Card states: 1234
User states: 567
Account states: 890
Merchant states: 345
```

### MongoDB Inspection

```javascript
// Connect to MongoDB
use transaction_classifier

// View a sample card state
db.card_state.findOne()

// View a sample user state
db.user_state.findOne()

// Count documents
db.card_state.count()
db.user_state.count()
```

### Verify Stateful Features

Monitor logs for non-default feature values:

**Good (Stateful)**:
```
Features (compact): {
    'VITEZA_900_CARD': 3.0,              # ✓ Non-zero
    'user_trans_count': 12.0,            # ✓ Non-zero
    'user_avg_amt_so_far': 87.45,        # ✓ Different from current
}
```

**Bad (Stateless - Problem)**:
```
Features (compact): {
    'VITEZA_900_CARD': 0.0,              # ✗ Always zero
    'user_trans_count': 0.0,             # ✗ Always zero
}
```

## Development

### Running with Auto-Reload

```bash
uvicorn main:app --reload --log-level debug
```

### Testing the API

Visit `http://localhost:8000/docs` for interactive API documentation.

## Dependencies

- **FastAPI**: Modern web framework
- **Motor**: Async MongoDB driver (for FastAPI)
- **PyMongo**: Sync MongoDB driver (for state management)
- **requests**: HTTP client for API calls
- **XGBoost**: ML framework for fraud detection
- **scikit-learn**: ML utilities and model support
- **pandas/numpy**: Data processing
- **joblib**: Model and encoding serialization
- **geopy**: Geographic distance calculations
- **sseclient-py**: Server-Sent Events client

## Troubleshooting

### SSL Certificate Errors
Set `VERIFY_SSL=false` in `.env` for development environments.

### MongoDB Connection Issues
Ensure MongoDB is running and `MONGO_URL` is correct in `.env`.

```bash
# Test MongoDB connection
python -c "from pymongo import MongoClient; print(MongoClient('mongodb://localhost:27017').admin.command('ping'))"
```

### Stream Connection Timeout
Check API key and network connectivity to the stream server.

### Model Loading Errors
Ensure `classifiers/model_corina_1.0.joblib` exists and is readable.

### "StateManager not available" Warning

**Problem**: Classifier is not using stateful features.

**Solution**: Verify state manager initialization in `services/stream_handler.py`:
```python
state_manager = StateManager(mongo_url=MONGO_URL, encoding_dir="classifiers/encodings")
classifier = TransactionClassifier(state_manager=state_manager)
```

### Features Are Always Zero/Default

**Problem**: State is not being updated or read correctly.

**Debug**:
1. Run test suite: `python test_state_manager.py`
2. Check state growth: `python test_state_manager.py --check-state`
3. Verify MongoDB indexes exist
4. Check logs for MongoDB connection errors

### Missing Target Encodings

**Problem**: No target encodings found in MongoDB.

**Impact**: System uses global fraud mean (0.0029) for all encodings. Reduced accuracy but still works.

**Solution**: Generate and save encodings to MongoDB:
```bash
python classifiers/generate_encodings.py /path/to/training_data.csv
```

**Verify**: Check that encodings were saved:
```bash
python test_state_manager.py --check-state
```

### Slow Performance

**Problem**: Processing takes > 500ms per transaction.

**Debug**:
1. Check MongoDB indexes: `db.card_state.getIndexes()`
2. Lower worker threads: `MAX_CONCURRENT_TASKS=50`
3. Check MongoDB query performance: `db.setProfilingLevel(1, {slowms: 10})`

For more troubleshooting, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

## Additional Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup and configuration guide
- **[STATE_MANAGEMENT_ARCHITECTURE.md](STATE_MANAGEMENT_ARCHITECTURE.md)** - Detailed state management design
- **[THREADING_ARCHITECTURE.md](THREADING_ARCHITECTURE.md)** - Threading model explanation
- **[classifiers/encodings/README.md](classifiers/encodings/README.md)** - Target encoding documentation

