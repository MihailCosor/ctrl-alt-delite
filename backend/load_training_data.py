#!/usr/bin/env python3
"""
Load Training Data to MongoDB

This script loads the CSV training data into MongoDB so we can query
historical features like the training script does.

Usage:
    python load_training_data.py [path_to_csv]
"""

import pandas as pd
import sys
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
import numpy as np

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

def load_csv_to_mongodb(csv_path: str):
    """Load CSV training data into MongoDB with proper indexing."""
    
    print("="*70)
    print("  LOADING TRAINING DATA TO MONGODB")
    print("="*70)
    
    # Check if CSV exists
    if not os.path.exists(csv_path):
        print(f"✗ CSV file not found: {csv_path}")
        return False
    
    df = load_data(csv_path)
    
    # Connect to MongoDB
    try:
        client = MongoClient(MONGO_URL)
        db = client.transaction_classifier
        collection = db.training_data
        
        print(f"✓ Connected to MongoDB: {MONGO_URL}")
    except Exception as e:
        print(f"✗ Error connecting to MongoDB: {e}")
        return False
    
    # Clear existing training data
    try:
        result = collection.delete_many({})
        print(f"✓ Cleared {result.deleted_count} existing training records")
    except Exception as e:
        print(f"✗ Error clearing existing data: {e}")
        return False
    
    # Prepare data for MongoDB
    print("📊 Preparing data for MongoDB...")
    
    # Convert DataFrame to list of dictionaries
    records = []
    for idx, row in df.iterrows():
        record = row.to_dict()
        
        # Convert NaN values to None for MongoDB
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
        
        # Add metadata
        record['_csv_row_index'] = idx
        record['_loaded_at'] = datetime.utcnow()
        
        records.append(record)
    
    print(f"✓ Prepared {len(records)} records")
    
    # Insert data in batches
    batch_size = 1000
    total_inserted = 0
    
    print("💾 Inserting data to MongoDB...")
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        
        try:
            result = collection.insert_many(batch)
            total_inserted += len(result.inserted_ids)
            
            if (i + batch_size) % 5000 == 0:
                print(f"  Inserted {total_inserted}/{len(records)} records...")
                
        except Exception as e:
            print(f"✗ Error inserting batch {i}-{i+batch_size}: {e}")
            return False
    
    print(f"✓ Successfully inserted {total_inserted} records")
    
    # Create indexes
    print("🔍 Creating indexes...")
    
    try:
        # Primary index on transaction_id (if exists)
        if 'trans_num' in df.columns:
            collection.create_index("trans_num", unique=True)
            print("✓ Created unique index on trans_num")
        elif 'transaction_id' in df.columns:
            collection.create_index("transaction_id", unique=True)
            print("✓ Created unique index on transaction_id")
        
        # Indexes for feature extraction queries
        collection.create_index("ssn")
        print("✓ Created index on ssn")
        
        collection.create_index("cc_num")
        print("✓ Created index on cc_num")
        
        collection.create_index("merchant")
        print("✓ Created index on merchant")
        
        collection.create_index("trans_datetime")
        print("✓ Created index on trans_datetime")
        
        # Compound indexes for common queries
        collection.create_index([("ssn", 1), ("trans_datetime", 1)])
        print("✓ Created compound index on (ssn, trans_datetime)")
        
        collection.create_index([("cc_num", 1), ("trans_datetime", 1)])
        print("✓ Created compound index on (cc_num, trans_datetime)")
        
        collection.create_index([("merchant", 1), ("trans_datetime", 1)])
        print("✓ Created compound index on (merchant, trans_datetime)")
        
        # Index for fraud analysis
        if 'is_fraud' in df.columns:
            collection.create_index("is_fraud")
            print("✓ Created index on is_fraud")
        
    except Exception as e:
        print(f"✗ Error creating indexes: {e}")
        return False
    
    # Verify data
    print("🔍 Verifying data...")
    
    try:
        total_count = collection.count_documents({})
        print(f"✓ Total records in MongoDB: {total_count}")
        
        if 'is_fraud' in df.columns:
            fraud_count = collection.count_documents({"is_fraud": 1})
            legit_count = collection.count_documents({"is_fraud": 0})
            print(f"✓ Fraudulent transactions: {fraud_count}")
            print(f"✓ Legitimate transactions: {legit_count}")
        
        # Sample record
        sample = collection.find_one()
        if sample:
            print(f"✓ Sample record keys: {list(sample.keys())}")
        
    except Exception as e:
        print(f"✗ Error verifying data: {e}")
        return False
    
    client.close()
    
    print("\n" + "="*70)
    print("  ✅ TRAINING DATA LOADED SUCCESSFULLY")
    print("="*70)
    print(f"📊 Records: {total_inserted}")
    print(f"🔍 Indexes: Created for efficient querying")
    print(f"💾 Collection: transaction_classifier.training_data")
    print("\n🎯 Ready for historical feature extraction!")
    
    return True


def load_data(file_path, separator='|'):
    """Load and preprocess training data."""
    print(f"Loading training data from {file_path}...")
    try:
        df = pd.read_csv(file_path, sep=separator, low_memory=False)
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
    
    # Remove rows without fraud label
    df = df.dropna(subset=['is_fraud'])
    print(f"Loaded {len(df)} transactions")
    print(f"Fraud rate: {df['is_fraud'].mean() * 100:.2f}%")
    
    return df


def main():
    """Main function."""
    
    # Default CSV path
    default_csv = "hackathon_train.csv"
    
    # Load data
    success = load_csv_to_mongodb(default_csv)



if __name__ == "__main__":
    main()
