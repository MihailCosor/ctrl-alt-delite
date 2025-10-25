# Transaction Classifier API

FastAPI backend for processing and classifying transaction streams.

## Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure environment variables:**
Create a `.env` file in the project root:
```env
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017

# API Configuration
API_KEY=YOUR_API_KEY
STREAM_URL=https://95.217.75.14:8443/stream
FLAG_URL=https://95.217.75.14:8443/api/flag

# SSL Verification (set to 'true' for production, 'false' for dev/self-signed certs)
VERIFY_SSL=false
```

3. **Run the server:**
```bash
uvicorn main:app --reload
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check and database connectivity
- `GET /stats` - Transaction processing statistics

## Features

- ✅ Real-time transaction stream processing
- ✅ MongoDB integration for transaction storage
- ✅ Async/await support
- ✅ Error handling and logging
- ✅ CORS middleware
- ✅ Health monitoring

