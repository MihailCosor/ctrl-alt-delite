import json
import os
import asyncio
import requests
from sseclient import SSEClient
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY", "YOUR_API_KEY")
STREAM_URL = os.getenv("STREAM_URL", "https://95.217.75.14:8443/stream")
FLAG_URL = os.getenv("FLAG_URL", "https://95.217.75.14:8443/api/flag")
VERIFY_SSL = os.getenv("VERIFY_SSL", "false").lower() == "true"

headers = {"X-API-Key": API_KEY}

# Disable SSL warnings when verification is off
if not VERIFY_SSL:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def flag_transaction(trans_num, flag_value):
    """Flag a transaction with the given classification value."""
    try:
        payload = {"trans_num": trans_num, "flag_value": flag_value}
        response = requests.post(FLAG_URL, headers=headers, json=payload, timeout=10, verify=VERIFY_SSL)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error flagging transaction {trans_num}: {e}")
        return None

async def save_transaction(database, transaction, classification):
    """Save transaction to MongoDB."""
    try:
        collection = database.transactions
        doc = {
            **transaction,
            "classification": classification,
            "processed_at": transaction.get("timestamp")
        }
        await collection.insert_one(doc)
    except Exception as e:
        print(f"Error saving transaction: {e}")

async def handle_transaction_from_stream(database):
    """Connect to SSE stream and process transactions in background."""
    await asyncio.sleep(1)  # Brief delay to ensure app is ready
    
    print("Connecting to transaction stream...")
    print(f"SSL Verification: {'Enabled' if VERIFY_SSL else 'Disabled'}")
    try:
        response = requests.get(STREAM_URL, headers=headers, stream=True, timeout=30, verify=VERIFY_SSL)
        client = SSEClient(response)

        for event in client.events():
            if event.data:
                try:
                    transaction = json.loads(event.data)
                    trans_num = transaction.get('trans_num')
                    print(f"Received transaction: {trans_num}")

                    # TODO: Implement classification logic here
                    classification_value = 0

                    # Flag the transaction
                    result = flag_transaction(trans_num, classification_value)
                    if result:
                        print(f"Flagged transaction {trans_num} with value {classification_value}")

                    # Save to database
                    await save_transaction(database, transaction, classification_value)

                except json.JSONDecodeError as e:
                    print(f"Error decoding transaction data: {e}")
                except Exception as e:
                    print(f"Error processing transaction: {e}")
                    
    except requests.exceptions.RequestException as e:
        print(f"Stream connection error: {e}")
    except Exception as e:
        print(f"Unexpected error in stream handler: {e}")
