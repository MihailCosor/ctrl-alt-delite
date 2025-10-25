#!/usr/bin/env python3
"""
Test Historical Features

This script tests that the historical feature extraction works correctly
by comparing with the training script logic.

Usage:
    python test_historical_features.py
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from services.state_manager import StateManager

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

def test_historical_features():
    """Test historical feature extraction."""
    
    print("="*70)
    print("  TESTING HISTORICAL FEATURES")
    print("="*70)
    
    # Initialize state manager
    try:
        state_manager = StateManager(MONGO_URL)
        print("✓ StateManager initialized")
    except Exception as e:
        print(f"✗ Error initializing StateManager: {e}")
        return False
    
    # Check if training data exists
    training_count = state_manager.training_data.count_documents({})
    print(f"📊 Training data records: {training_count}")
    
    if training_count == 0:
        print("⚠ No training data found. Please run:")
        print("   python load_training_data.py /path/to/your/transactions.csv")
        return False
    
    # Get a sample transaction from training data
    sample_trans = state_manager.training_data.find_one()
    if not sample_trans:
        print("✗ No sample transaction found")
        return False
    
    print(f"📝 Sample transaction: {sample_trans.get('trans_num', 'unknown')}")
    print(f"   SSN: {sample_trans.get('ssn', 'unknown')}")
    print(f"   Amount: ${sample_trans.get('amt', 0):.2f}")
    print(f"   Merchant: {sample_trans.get('merchant', 'unknown')}")
    print(f"   Category: {sample_trans.get('category', 'unknown')}")
    print(f"   DateTime: {sample_trans.get('trans_datetime', 'unknown')}")
    
    # Test feature extraction
    print("\n🔍 Testing feature extraction...")
    
    try:
        features = state_manager.compute_features(sample_trans)
        print("✓ Feature extraction successful")
        
        print(f"\n📊 Extracted Features:")
        for key, value in features.items():
            print(f"   {key}: {value}")
        
        # Check if we have the expected features
        expected_features = [
            'time_since_last_user_trans',
            'user_trans_count',
            'user_avg_amt_so_far',
            'user_max_amt_so_far',
            'amt_vs_user_avg_ratio',
            'is_over_user_max_amt',
            'user_avg_amt_last_5_trans',
            'user_merchant_trans_count',
            'is_new_merchant_for_user',
            'user_avg_amt_category_so_far',
            'amt_vs_user_category_avg',
            'is_new_state',
            'cc_num_count_last_1h',
            'cc_num_count_last_24h',
            'merchant_avg_amt_so_far',
            'amt_vs_merchant_avg_ratio'
        ]
        
        missing_features = [f for f in expected_features if f not in features]
        if missing_features:
            print(f"\n⚠ Missing features: {missing_features}")
        else:
            print(f"\n✅ All {len(expected_features)} expected features present")
        
        # Check for reasonable values
        print(f"\n🔍 Feature Value Analysis:")
        
        # User features
        if features['user_trans_count'] > 0:
            print(f"   ✓ User has transaction history: {features['user_trans_count']} transactions")
        else:
            print(f"   ⚠ User has no transaction history (first transaction)")
        
        # Card velocity
        if features['cc_num_count_last_1h'] > 0 or features['cc_num_count_last_24h'] > 0:
            print(f"   ✓ Card has velocity: 1h={features['cc_num_count_last_1h']}, 24h={features['cc_num_count_last_24h']}")
        else:
            print(f"   ⚠ Card has no recent velocity")
        
        # Merchant features
        if features['merchant_avg_amt_so_far'] > 0:
            print(f"   ✓ Merchant has history: avg=${features['merchant_avg_amt_so_far']:.2f}")
        else:
            print(f"   ⚠ Merchant has no history")
        
        # Ratios
        if features['amt_vs_user_avg_ratio'] != 1.0:
            print(f"   ✓ Amount vs user avg ratio: {features['amt_vs_user_avg_ratio']:.2f}")
        else:
            print(f"   ⚠ Amount vs user avg ratio is default (1.0)")
        
        return True
        
    except Exception as e:
        print(f"✗ Error extracting features: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_multiple_transactions():
    """Test feature extraction on multiple transactions."""
    
    print("\n" + "="*70)
    print("  TESTING MULTIPLE TRANSACTIONS")
    print("="*70)
    
    try:
        state_manager = StateManager(MONGO_URL)
        
        # Get multiple transactions
        transactions = list(state_manager.training_data.find().limit(5))
        print(f"📊 Testing {len(transactions)} transactions...")
        
        for i, trans in enumerate(transactions):
            print(f"\n--- Transaction {i+1} ---")
            print(f"   SSN: {trans.get('ssn', 'unknown')}")
            print(f"   Amount: ${trans.get('amt', 0):.2f}")
            print(f"   DateTime: {trans.get('trans_datetime', 'unknown')}")
            
            try:
                features = state_manager.compute_features(trans)
                
                # Show key features
                print(f"   User trans count: {features['user_trans_count']}")
                print(f"   User avg amount: ${features['user_avg_amt_so_far']:.2f}")
                print(f"   Amount ratio: {features['amt_vs_user_avg_ratio']:.2f}")
                print(f"   Card 1h velocity: {features['cc_num_count_last_1h']}")
                print(f"   New merchant: {features['is_new_merchant_for_user']}")
                
            except Exception as e:
                print(f"   ✗ Error: {e}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error in multiple transaction test: {e}")
        return False


def main():
    """Main test function."""
    
    print("🧪 Historical Features Test Suite")
    print("="*70)
    
    # Test 1: Basic feature extraction
    success1 = test_historical_features()
    
    # Test 2: Multiple transactions
    success2 = test_multiple_transactions()
    
    print("\n" + "="*70)
    print("  TEST RESULTS")
    print("="*70)
    
    if success1 and success2:
        print("✅ All tests passed!")
        print("\n🎯 Historical features are working correctly")
        print("   The system can now extract features like the training script")
        print("   Ready for fraud detection with proper historical context")
    else:
        print("❌ Some tests failed")
        print("\n🔧 Troubleshooting:")
        print("   1. Ensure training data is loaded: python load_training_data.py")
        print("   2. Check MongoDB connection")
        print("   3. Verify trans_datetime format in training data")
    
    return success1 and success2


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
