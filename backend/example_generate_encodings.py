#!/usr/bin/env python3
"""
Example script showing how to generate target encodings from training data.

This script demonstrates the complete workflow:
1. Generate encodings from CSV training data
2. Save them to MongoDB
3. Verify they were saved correctly
4. Test that the service can load them

Usage:
    python example_generate_encodings.py /path/to/training_data.csv
"""

import sys
import os
from pymongo import MongoClient
from classifiers.generate_encodings import main as generate_encodings_main

def verify_encodings_in_mongodb(mongo_url="mongodb://localhost:27017"):
    """Verify that encodings were saved to MongoDB correctly."""
    print("\n" + "="*60)
    print("  VERIFYING ENCODINGS IN MONGODB")
    print("="*60)
    
    try:
        client = MongoClient(mongo_url)
        db = client.transaction_classifier
        collection = db.target_encodings
        
        # Count total encodings
        total_count = collection.count_documents({})
        print(f"Total encoding entries: {total_count}")
        
        # Count by feature
        features = ['merchant', 'city', 'state', 'acct_num', 'ssn']
        for feature in features:
            count = collection.count_documents({"feature": feature})
            print(f"  {feature}: {count} entries")
        
        # Check global fraud mean
        global_doc = collection.find_one({"feature": "_global"})
        if global_doc:
            print(f"  Global fraud mean: {global_doc['fraud_rate']:.6f}")
        
        # Show sample encoding
        sample = collection.find_one({"feature": "merchant"})
        if sample:
            print(f"\nSample encoding:")
            print(f"  Feature: {sample['feature']}")
            print(f"  Value: {sample['value']}")
            print(f"  Fraud rate: {sample['fraud_rate']:.6f}")
        
        client.close()
        print("\n✓ Encodings verified in MongoDB")
        return True
        
    except Exception as e:
        print(f"✗ Error verifying encodings: {e}")
        return False

def test_state_manager_loading():
    """Test that StateManager can load the encodings."""
    print("\n" + "="*60)
    print("  TESTING STATEMANAGER LOADING")
    print("="*60)
    
    try:
        from services.state_manager import StateManager
        
        # Initialize state manager (this will load encodings from MongoDB)
        state_manager = StateManager("mongodb://localhost:27017")
        
        # Test encoding lookup
        test_merchant = "Test Merchant"
        encoding = state_manager.get_target_encoding('merchant', test_merchant)
        print(f"Encoding for '{test_merchant}': {encoding:.6f}")
        
        # Test global mean
        print(f"Global fraud mean: {state_manager.global_fraud_mean:.6f}")
        
        # Show loaded features
        print(f"\nLoaded encoding features: {list(state_manager.encoding_maps.keys())}")
        for feature, encoding_map in state_manager.encoding_maps.items():
            print(f"  {feature}: {len(encoding_map)} entries")
        
        state_manager.close()
        print("\n✓ StateManager loaded encodings successfully")
        return True
        
    except Exception as e:
        print(f"✗ Error testing StateManager: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main example workflow."""
    if len(sys.argv) < 2:
        print("Usage: python example_generate_encodings.py <path_to_training_data.csv>")
        print("\nExample:")
        print("  python example_generate_encodings.py /path/to/hackathon-labeled-train.csv")
        sys.exit(1)
    
    training_data_path = sys.argv[1]
    mongo_url = "mongodb://localhost:27017"
    
    print("="*60)
    print("  TARGET ENCODING GENERATION EXAMPLE")
    print("="*60)
    print(f"Training data: {training_data_path}")
    print(f"MongoDB URL: {mongo_url}")
    
    # Step 1: Generate encodings
    print(f"\nStep 1: Generating encodings from training data...")
    try:
        # Temporarily modify sys.argv to pass to generate_encodings_main
        original_argv = sys.argv.copy()
        sys.argv = ['generate_encodings.py', training_data_path, mongo_url]
        generate_encodings_main()
        sys.argv = original_argv
    except Exception as e:
        print(f"✗ Error generating encodings: {e}")
        sys.exit(1)
    
    # Step 2: Verify in MongoDB
    if not verify_encodings_in_mongodb(mongo_url):
        sys.exit(1)
    
    # Step 3: Test StateManager loading
    if not test_state_manager_loading():
        sys.exit(1)
    
    # Success
    print("\n" + "="*60)
    print("  SUCCESS!")
    print("="*60)
    print("✓ Target encodings generated and saved to MongoDB")
    print("✓ StateManager can load encodings correctly")
    print("✓ Service is ready to use stateful features")
    print("\nNext steps:")
    print("  1. Start the service: ./start.sh")
    print("  2. Monitor logs for encoding loading confirmation")
    print("  3. Check that features are no longer using defaults")

if __name__ == "__main__":
    main()
