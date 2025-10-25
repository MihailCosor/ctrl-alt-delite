from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import motor.motor_asyncio
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
database = client.transaction_classifier

app = FastAPI()

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