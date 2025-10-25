#!/bin/bash

# Transaction Classifier Backend - Start Script

echo "🚀 Starting Transaction Classifier Backend..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt --quiet

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Please create one with your configuration."
    echo "   See README.md for details."
    exit 1
fi

# Start the server
echo ""
echo "✅ Starting FastAPI server..."
echo "📍 API will be available at: http://localhost:8000"
echo "📚 Documentation at: http://localhost:8000/docs"
echo ""
uvicorn main:app --reload

