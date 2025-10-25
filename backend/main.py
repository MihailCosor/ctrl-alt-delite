from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import motor.motor_asyncio
import os
import asyncio
from dotenv import load_dotenv
from services import handle_transaction_from_stream

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
database = client.transaction_classifier

app = FastAPI(title="Transaction Classifier API", version="1.0.0")

# CORS middleware (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "ctrl+alt+delite backend is running."}

@app.get("/health")
async def health_check():
    try:
        await client.admin.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/stats")
async def get_stats():
    """Get transaction processing statistics."""
    try:
        collection = database.transactions
        total = await collection.count_documents({})
        return {"total_transactions": total}
    except Exception as e:
        return {"error": str(e)}

@app.on_event("startup")
async def startup_event():
    # Run stream handler in background task
    asyncio.create_task(handle_transaction_from_stream(database))

@app.on_event("shutdown")
async def shutdown_event():
    client.close()