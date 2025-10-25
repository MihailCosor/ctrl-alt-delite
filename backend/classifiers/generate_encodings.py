"""
Generate Target Encoding Maps from Training Data

This script extracts the target encoding maps from the training process
and saves them directly to MongoDB for use in production inference.

NOTE: The current model (robica_2.0) does NOT use target encodings.
This script is kept for reference and potential future models (like corina_1.0)
that may require target encodings.

Usage:
    python generate_encodings.py <path_to_training_data.csv> [mongo_url]

Requirements:
    - Training data file in CSV format
    - Same preprocessing as corina_1.0.py
    - MongoDB running (default: mongodb://localhost:27017)
"""

import pandas as pd
import numpy as np
import os
import sys
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()


def load_training_data(file_path, separator='|'):
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


def compute_target_encodings(df, high_card_features):
    """
    Compute target encoding maps for high-cardinality features.
    
    Args:
        df: DataFrame with training data
        high_card_features: List of feature names to encode
        
    Returns:
        Dictionary of encoding maps
    """
    print("\nComputing target encodings...")
    
    encoding_maps = {}
    global_fraud_mean = df['is_fraud'].mean()
    
    for feature in high_card_features:
        if feature not in df.columns:
            print(f"Warning: Feature '{feature}' not found in data")
            continue
        
        # Convert to string to handle various types
        df[feature] = df[feature].astype(str)
        
        # Compute fraud rate for each value
        encoding_map = df.groupby(feature)['is_fraud'].mean().to_dict()
        
        encoding_maps[feature] = encoding_map
        print(f"  {feature}: {len(encoding_map)} unique values")
    
    return encoding_maps, global_fraud_mean


def save_encodings_to_mongodb(encoding_maps, mongo_url, global_fraud_mean):
    """Save encoding maps to MongoDB target_encodings collection."""
    print(f"\nSaving encoding maps to MongoDB...")
    
    try:
        # Connect to MongoDB
        client = MongoClient(mongo_url)
        db = client.transaction_classifier
        collection = db.target_encodings
        
        print(f"Connected to MongoDB: {mongo_url}")
        
        # Clear existing encodings
        collection.delete_many({})
        print("Cleared existing target encodings")
        
        # Insert new encodings
        total_inserted = 0
        for feature, encoding_map in encoding_maps.items():
            # Convert encoding map to list of documents
            documents = []
            for value, fraud_rate in encoding_map.items():
                documents.append({
                    "feature": feature,
                    "value": str(value),  # Ensure string type
                    "fraud_rate": float(fraud_rate),
                    "created_at": datetime.utcnow()
                })
            
            # Insert in batches for better performance
            if documents:
                collection.insert_many(documents)
                total_inserted += len(documents)
                print(f"  ✓ Saved {feature}: {len(documents)} entries")
        
        # Save global fraud mean as a special document
        collection.insert_one({
            "feature": "_global",
            "value": "fraud_mean",
            "fraud_rate": float(global_fraud_mean),
            "created_at": datetime.utcnow()
        })
        total_inserted += 1
        
        print(f"\n✓ Total {total_inserted} encoding entries saved to MongoDB")
        print(f"✓ Global fraud mean: {global_fraud_mean:.6f}")
        
        # Create index for fast lookups
        collection.create_index([("feature", 1), ("value", 1)], unique=True)
        print("✓ Created index on (feature, value)")
        
        client.close()
        
    except Exception as e:
        print(f"✗ Error saving to MongoDB: {e}")
        raise


def main():
    """Main execution flow."""
    if len(sys.argv) < 2:
        print("Usage: python generate_encodings.py <path_to_training_data.csv> [mongo_url]")
        print("\nExample:")
        print("  python generate_encodings.py /path/to/hackathon-labeled-train.csv")
        print("  python generate_encodings.py /path/to/hackathon-labeled-train.csv mongodb://localhost:27017")
        sys.exit(1)
    
    # Configuration
    file_path = sys.argv[1]
    mongo_url = sys.argv[2] if len(sys.argv) > 2 else os.getenv("MONGO_URL", "mongodb://localhost:27017")
    separator = '|'  # CSV separator
    high_card_features = ['merchant', 'city', 'state', 'acct_num', 'ssn']
    
    print(f"Target encodings will be saved to MongoDB: {mongo_url}")
    
    # Load data
    df = load_training_data(file_path, separator)
    
    # Compute encodings
    encoding_maps, global_fraud_mean = compute_target_encodings(df, high_card_features)
    
    # Save encodings to MongoDB
    save_encodings_to_mongodb(encoding_maps, mongo_url, global_fraud_mean)
    
    print(f"\n✓ Complete!")
    print(f"\nTarget encodings are now available in MongoDB and will be loaded automatically.")
    print(f"No service restart required - encodings are loaded dynamically.")
    print(f"\n⚠ NOTE: The current model (robica_2.0) does NOT use target encodings.")
    print(f"   This script is for reference or future models that may require them.")


if __name__ == "__main__":
    main()

