# Transaction Classifier API

FastAPI backend for processing and classifying transaction streams using machine learning.

## Features

- ✅ Real-time SSE stream processing with concurrent handling (up to 300 transactions)
- ✅ XGBoost-based fraud detection model
- ✅ MongoDB integration for transaction storage
- ✅ Async/await architecture for high performance
- ✅ Automatic error handling and recovery
- ✅ CORS middleware support
- ✅ Health monitoring and statistics

## Project Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── services/
│   ├── __init__.py           # Service exports
│   ├── stream_handler.py     # SSE stream processing with concurrency
│   └── classifier.py         # ML model wrapper
├── classifiers/
│   └── model_corina_1.0.joblib  # Trained XGBoost model
└── README.md
```

## Setup

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

# Concurrency Settings (optional)
MAX_CONCURRENT_TASKS=50
```

### 3. Start MongoDB (if running locally)

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use your existing MongoDB instance
```

### 4. Run the Server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root endpoint - API status |
| `GET` | `/health` | Health check and database connectivity |
| `GET` | `/stats` | Transaction processing statistics |
| `GET` | `/docs` | Interactive API documentation (Swagger UI) |

## Architecture

### Concurrent Processing

The stream handler can process multiple transactions simultaneously:
- Uses `asyncio` tasks for non-blocking processing
- Configurable concurrency limit (default: 50 concurrent tasks)
- Automatic task cleanup to prevent memory buildup
- Can handle bursts of 300+ transactions efficiently

### ML Model Integration

- Model loaded once at startup for optimal performance
- XGBoost classifier trained on fraud detection features
- Prediction threshold: 0.80 (optimized for high precision)
- Fallback to safe classification (0) if model fails

### Data Flow

1. **Receive** - Transaction arrives via SSE stream
2. **Classify** - ML model predicts fraud probability
3. **Flag** - Submit classification to API endpoint (async)
4. **Store** - Save transaction + classification to MongoDB

## Configuration

### Concurrency Tuning

Adjust `MAX_CONCURRENT_TASKS` based on your server capacity:
- **Low (10-25)**: Limited resources, stable connection
- **Medium (50)**: Default, good balance
- **High (100+)**: Powerful server, high throughput

### SSL Configuration

- **Development**: `VERIFY_SSL=false` (bypass self-signed cert errors)
- **Production**: `VERIFY_SSL=true` (verify certificates)

## Monitoring

Check application health:
```bash
curl http://localhost:8000/health
```

Get processing statistics:
```bash
curl http://localhost:8000/stats
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
- **Motor**: Async MongoDB driver
- **httpx**: Async HTTP client for API calls
- **XGBoost**: ML framework for fraud detection
- **scikit-learn**: ML utilities and model support
- **pandas/numpy**: Data processing
- **sseclient-py**: Server-Sent Events client

## Troubleshooting

### SSL Certificate Errors
Set `VERIFY_SSL=false` in `.env` for development environments.

### MongoDB Connection Issues
Ensure MongoDB is running and `MONGO_URL` is correct in `.env`.

### Stream Connection Timeout
Check API key and network connectivity to the stream server.

### Model Loading Errors
Ensure `classifiers/model_corina_1.0.joblib` exists and is readable.

