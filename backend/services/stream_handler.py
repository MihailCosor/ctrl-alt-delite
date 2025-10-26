import json
import os
import threading
import requests
from sseclient import SSEClient
from dotenv import load_dotenv
from .classifier import TransactionClassifier
from .state_manager import StateManager
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
import pymongo
from pymongo import MongoClient
from datetime import datetime

load_dotenv()

API_KEY = os.getenv("API_KEY", "YOUR_API_KEY")
STREAM_URL = os.getenv("STREAM_URL", "https://95.217.75.14:8443/stream")
FLAG_URL = os.getenv("FLAG_URL", "https://95.217.75.14:8443/api/flag")
VERIFY_SSL = os.getenv("VERIFY_SSL", "false").lower() == "true"
MAX_WORKERS = int(os.getenv("MAX_CONCURRENT_TASKS", "100"))
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

headers = {"X-API-Key": API_KEY}

# Disable SSL warnings when verification is off
if not VERIFY_SSL:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Initialize state manager (loaded once at startup)
state_manager = StateManager(mongo_url=MONGO_URL)

# Initialize classifier with state manager (loaded once at startup)
# robica_2.0 uses LightGBM with threshold 0.90
classifier = TransactionClassifier(
    model_path="classifiers/fraud_model_v10_simplified_features.joblib",
    threshold=0.10,
    state_manager=state_manager
)

# Thread pool for processing transactions
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="transaction-worker")

def flag_transaction(trans_num, flag_value):
    """Flag a transaction with the given classification value (fire-and-forget in separate thread)."""
    try:
        payload = {"trans_num": trans_num, "flag_value": flag_value}
        response = requests.post(
            FLAG_URL, 
            headers=headers, 
            json=payload, 
            timeout=2.0, 
            verify=VERIFY_SSL
        )
        response.raise_for_status()
        print(f"  ↳ Flagged {trans_num} = {flag_value}")
        return response.json()
    except requests.exceptions.Timeout:
        # Silently continue on timeout - this is fire-and-forget
        return None
    except requests.exceptions.RequestException as e:
        # Only log non-timeout errors
        if "timeout" not in str(e).lower():
            print(f"⚠ HTTP error flagging {trans_num}: {e}")
        return None
    except Exception as e:
        print(f"⚠ Error flagging {trans_num}: {e}")
        return None


def save_transaction(db_collection, db_aux_collection, transaction, classification):
    """Save transaction to MongoDB (synchronous)."""
    try:
        timestamp = datetime.now(timezone.utc)
        doc = {
            **transaction,
            "_loaded_at": timestamp
        }
        db_collection.insert_one(doc)

        aux_doc = {
            "transaction": transaction,
            "classification": classification,
            "processed_at": timestamp
        }
        db_aux_collection.insert_one(aux_doc)

    except Exception as e:
        print(f"Error saving transaction: {e}")


def process_single_transaction(transaction, db_collection, db_aux_collection):
    """
    Process a single transaction in a worker thread.
    
    Flow with state management:
    1. Classify the transaction (reads state)
    2. Fire off flag request in background thread (don't wait)
    3. Save to database
    4. Update state (writes state for next transaction)
    """
    trans_num = transaction.get('trans_num', '?')
    try:
        # Classify the transaction (reads current state from MongoDB)
        classification_value = classifier.classify(transaction)
        print(f"✓ Classified {trans_num} = {classification_value}")
        
        # Fire off flagging in separate thread (fire-and-forget)
        threading.Thread(
            target=flag_transaction, 
            args=(trans_num, classification_value),
            daemon=True,
            name=f"flag-{trans_num[:8]}"
        ).start()
        
        # Save to database
        save_transaction(db_collection, db_aux_collection, transaction, classification_value)
        
        # Update state for future transactions
        state_manager.update_state(transaction)

    except Exception as e:
        print(f"✗ Error processing transaction {trans_num}: {e}")
        import traceback
        traceback.print_exc()

def handle_transaction_from_stream_sync(mongo_url):
    """
    Connect to SSE stream and process transactions using threading.
    This runs in a single background thread started by FastAPI.
    """
    import time
    time.sleep(1)  # Brief delay to ensure app is ready
    
    print("Connecting to transaction stream...")
    print(f"SSL Verification: {'Enabled' if VERIFY_SSL else 'Disabled'}")
    print(f"Max Workers: {MAX_WORKERS}")
    print(f"Stream URL: {STREAM_URL}")
    print(f"Flag URL: {FLAG_URL}")
    
    # Create synchronous MongoDB connection
    mongo_client = MongoClient(mongo_url)
    database = mongo_client.transaction_classifier
    db_collection = database.training_data
    db_aux_collection = database.transactions
    
    try:
        print("Initiating SSE stream connection...")
        response = requests.get(STREAM_URL, headers=headers, stream=True, timeout=30, verify=VERIFY_SSL)
        print(f"Stream response status: {response.status_code}")
        response.raise_for_status()
        
        client = SSEClient(response)
        print("✓ Successfully connected to transaction stream!")
        print("Listening for transaction events...")
        
        event_count = 0
        
        for event in client.events():
            event_count += 1
            if event_count % 50 == 0:
                print(f"[Stats] Received {event_count} events")
            
            if event.data:
                try:
                    transaction = json.loads(event.data)
                    # calc unix time based on trans_date and trans_time
                    trans_date = transaction.get('trans_date')
                    trans_time = transaction.get('trans_time')
                    if trans_date and trans_time:
                        transaction['unix_time'] = int(time.mktime(time.strptime(f"{trans_date} {trans_time}", "%Y-%m-%d %H:%M:%S")))
                    else:
                        transaction['unix_time'] = 0

                    trans_num = transaction.get('trans_num')
                    print(f"Received transaction: {trans_num}")
                    # display transaction details if needed
                    print(json.dumps(transaction, indent=2))
                    
                    # Submit transaction to thread pool for processing
                    executor.submit(process_single_transaction, transaction, db_collection, db_aux_collection)
                    
                except json.JSONDecodeError as e:
                    print(f"Error decoding transaction data: {e}")
                except Exception as e:
                    print(f"Error queuing transaction: {e}")
                    
    except requests.exceptions.RequestException as e:
        print(f"Stream connection error: {e}")
    except Exception as e:
        print(f"Unexpected error in stream handler: {e}")
        import traceback
        traceback.print_exc()
    finally:
        mongo_client.close()
        print("Stream handler stopped.")


# Async wrapper for FastAPI lifespan compatibility
async def handle_transaction_from_stream(database):
    """
    Async wrapper that starts the synchronous stream handler in a background thread.
    This is called by FastAPI's lifespan manager.
    """
    import asyncio
    
    # Get MongoDB URL from database connection
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    # Start the stream handler in a separate thread
    stream_thread = threading.Thread(
        target=handle_transaction_from_stream_sync,
        args=(mongo_url,),
        daemon=True,
        name="stream-handler"
    )
    stream_thread.start()
    
    print(f"Stream handler thread started: {stream_thread.name}")
    
    # Keep the async function alive (FastAPI lifespan requirement)
    # This will run until the application shuts down
    while stream_thread.is_alive():
        await asyncio.sleep(10)  # Check every 10 seconds
