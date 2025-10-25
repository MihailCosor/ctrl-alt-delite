"""
State Manager for Fraud Detection Feature Store

This module manages the stateful features required for fraud detection.
It uses MongoDB as a persistent state store with separate collections for:
- card_state: Card-level velocity and transaction history
- user_state: User (SSN) level transaction patterns
- account_state: Account-level aggregations
- merchant_state: Merchant-level aggregations
- target_encodings: Static target encoding maps from training

Critical: DO NOT query the raw transactions collection during inference.
All state is pre-aggregated and stored in these dedicated collections.
"""

import time
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import pymongo
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError
import joblib
import os
import numpy as np


class StateManager:
    """Manages persistent state for fraud detection feature engineering."""
    
    def __init__(self, mongo_url: str):
        """
        Initialize the state manager.
        
        Args:
            mongo_url: MongoDB connection string
        """
        self.client = MongoClient(mongo_url)
        self.db = self.client.transaction_classifier
        
        # State collections
        self.card_state = self.db.card_state
        self.user_state = self.db.user_state
        self.account_state = self.db.account_state
        self.merchant_state = self.db.merchant_state
        self.target_encodings = self.db.target_encodings
        
        # In-memory cache for target encodings (static artifacts)
        self.encoding_maps = {}
        self.global_fraud_mean = 0.0029  # Default from training
        
        # Initialize indexes and load encodings
        self._ensure_indexes()
        self._load_target_encodings()
        
        print("✓ StateManager initialized")
    
    def _ensure_indexes(self):
        """Create indexes on state collections for fast lookups."""
        try:
            # Card state: indexed by card number
            self.card_state.create_index([("cc_num", ASCENDING)], unique=True)
            
            # User state: indexed by SSN
            self.user_state.create_index([("ssn", ASCENDING)], unique=True)
            
            # Account state: indexed by account number
            self.account_state.create_index([("acct_num", ASCENDING)], unique=True)
            
            # Merchant state: indexed by merchant name
            self.merchant_state.create_index([("merchant", ASCENDING)], unique=True)
            
            # Target encodings: indexed by feature name and value
            self.target_encodings.create_index([
                ("feature", ASCENDING),
                ("value", ASCENDING)
            ], unique=True)
            
            print("✓ State collection indexes created")
        except Exception as e:
            print(f"⚠ Error creating indexes (may already exist): {e}")
    
    def _load_target_encodings(self):
        """
        Load target encoding maps from MongoDB target_encodings collection.
        
        These are static artifacts computed during training and stored in MongoDB.
        They map categorical values to fraud rates.
        
        MongoDB schema:
        {
            "feature": "merchant",
            "value": "Acme Corp",
            "fraud_rate": 0.0156,
            "created_at": ISODate(...)
        }
        """
        try:
            # Load encodings from MongoDB
            encoding_docs = self.target_encodings.find({})
            
            # Group by feature
            feature_encodings = {}
            for doc in encoding_docs:
                feature = doc.get('feature')
                value = doc.get('value')
                fraud_rate = doc.get('fraud_rate')
                
                if feature and value is not None and fraud_rate is not None:
                    if feature not in feature_encodings:
                        feature_encodings[feature] = {}
                    feature_encodings[feature][value] = fraud_rate
            
            # Store in encoding_maps (skip _global)
            for feature, encoding_map in feature_encodings.items():
                if feature != '_global':
                    self.encoding_maps[feature] = encoding_map
                    print(f"✓ Loaded {feature} encoding map ({len(encoding_map)} entries)")
            
            # Get global fraud mean
            global_doc = self.target_encodings.find_one({"feature": "_global", "value": "fraud_mean"})
            if global_doc:
                self.global_fraud_mean = global_doc.get('fraud_rate', 0.0029)
                print(f"✓ Loaded global fraud mean: {self.global_fraud_mean:.6f}")
            
            if not self.encoding_maps:
                print("⚠ No encoding maps found in MongoDB, using global mean for all encodings")
                
        except Exception as e:
            print(f"⚠ Error loading encodings from MongoDB: {e}")
            print("  Using default global fraud mean for all encodings")
    
    def get_target_encoding(self, feature: str, value: str) -> float:
        """
        Get target encoding for a categorical value.
        
        Args:
            feature: Feature name (e.g., 'merchant', 'city')
            value: Feature value to encode
            
        Returns:
            Encoded value (fraud rate)
        """
        if feature in self.encoding_maps:
            return self.encoding_maps[feature].get(value, self.global_fraud_mean)
        return self.global_fraud_mean
    
    def get_card_state(self, cc_num: str) -> Dict[str, Any]:
        """
        Retrieve card state from MongoDB.
        
        Returns state for velocity, time deltas, and average amount.
        """
        state = self.card_state.find_one({"cc_num": cc_num})
        
        if state is None:
            # First transaction for this card
            return {
                "cc_num": cc_num,
                "last_transaction_time": 0,
                "transaction_count": 0,
                "total_amount": 0.0,
                "avg_amount": 0.0,
                "transactions_15min": [],  # List of unix timestamps
                "transactions_1hr": [],
                "transactions_24hr": []
            }
        
        return state
    
    def get_user_state(self, ssn: str) -> Dict[str, Any]:
        """
        Retrieve user (SSN) state from MongoDB.
        
        Returns state for user transaction patterns.
        """
        state = self.user_state.find_one({"ssn": ssn})
        
        if state is None:
            # First transaction for this user
            return {
                "ssn": ssn,
                "last_transaction_time": 0,
                "transaction_count": 0,
                "total_amount": 0.0,
                "avg_amount": 0.0,
                "max_amount": 0.0
            }
        
        return state
    
    def get_account_state(self, acct_num: str) -> Dict[str, Any]:
        """
        Retrieve account state from MongoDB.
        
        Returns number of unique cards associated with this account.
        """
        state = self.account_state.find_one({"acct_num": acct_num})
        
        if state is None:
            return {
                "acct_num": acct_num,
                "unique_cards": set()
            }
        
        # Convert list back to set
        if "unique_cards" in state:
            state["unique_cards"] = set(state["unique_cards"])
        
        return state
    
    def get_merchant_state(self, merchant: str) -> Dict[str, Any]:
        """
        Retrieve merchant state from MongoDB.
        
        Returns number of unique cards that have transacted with this merchant.
        """
        state = self.merchant_state.find_one({"merchant": merchant})
        
        if state is None:
            return {
                "merchant": merchant,
                "unique_cards": set()
            }
        
        # Convert list back to set
        if "unique_cards" in state:
            state["unique_cards"] = set(state["unique_cards"])
        
        return state
    
    def compute_features(self, transaction: Dict[str, Any]) -> Dict[str, float]:
        """
        Compute stateful features for a transaction.
        
        This method:
        1. Reads current state from MongoDB
        2. Computes features based on historical data
        3. Returns feature values (does NOT update state)
        
        State updates happen separately in update_state().
        
        Args:
            transaction: Raw transaction dictionary
            
        Returns:
            Dictionary of computed stateful features
        """
        cc_num = str(transaction.get('cc_num', ''))
        ssn = str(transaction.get('ssn', ''))
        acct_num = str(transaction.get('acct_num', ''))
        merchant = transaction.get('merchant', '')
        unix_time = int(transaction.get('unix_time', 0))
        amt = float(transaction.get('amt', 0.0))
        
        # Fetch states
        card_state = self.get_card_state(cc_num)
        user_state = self.get_user_state(ssn)
        account_state = self.get_account_state(acct_num)
        merchant_state = self.get_merchant_state(merchant)
        
        # Card-level features
        features = {}
        
        # 1. Velocity features (transactions in time windows)
        current_time = unix_time
        transactions_15min = [t for t in card_state.get("transactions_15min", []) if current_time - t < 900]
        transactions_1hr = [t for t in card_state.get("transactions_1hr", []) if current_time - t < 3600]
        transactions_24hr = [t for t in card_state.get("transactions_24hr", []) if current_time - t < 86400]
        
        features['VITEZA_900_CARD'] = float(len(transactions_15min))
        features['VITEZA_3600_CARD'] = float(len(transactions_1hr))
        features['VITEZA_86400_CARD'] = float(len(transactions_24hr))
        
        # 2. Time since last transaction
        last_trx_time = card_state.get("last_transaction_time", 0)
        if last_trx_time > 0:
            features['TIMP_DE_LA_ULTIMA_TRX_SEC_CARD'] = float(unix_time - last_trx_time)
        else:
            features['TIMP_DE_LA_ULTIMA_TRX_SEC_CARD'] = float(86400 * 30)  # 30 days default
        
        # 3. Amount deviation factor
        card_avg_amt = card_state.get("avg_amount", amt)
        if card_avg_amt > 0:
            features['ABATERE_SUMA_FACTOR'] = float(amt / card_avg_amt)
        else:
            features['ABATERE_SUMA_FACTOR'] = 1.0
        
        # 4. Entity aggregations
        features['NR_CARDURI_PE_CONT'] = float(len(account_state.get("unique_cards", {cc_num})))
        features['NR_CARDURI_PE_MERCHANT'] = float(len(merchant_state.get("unique_cards", {cc_num})))
        
        # User (SSN) level features
        user_last_trx_time = user_state.get("last_transaction_time", 0)
        if user_last_trx_time > 0:
            features['time_since_last_user_trans'] = float(unix_time - user_last_trx_time)
        else:
            features['time_since_last_user_trans'] = float(86400 * 30)
        
        features['user_trans_count'] = float(user_state.get("transaction_count", 0))
        
        user_avg_amt = user_state.get("avg_amount", amt)
        features['user_avg_amt_so_far'] = float(user_avg_amt)
        
        user_max_amt = user_state.get("max_amount", amt)
        features['user_max_amt_so_far'] = float(user_max_amt)
        
        # Amount vs user average ratio
        if user_avg_amt > 0:
            features['amt_vs_user_avg_ratio'] = float(amt / user_avg_amt)
        else:
            features['amt_vs_user_avg_ratio'] = 1.0
        
        # Is over user max amount
        features['is_over_user_max_amt'] = 1 if amt > user_max_amt else 0
        
        # Target encodings
        features['merchant_encoded'] = self.get_target_encoding('merchant', merchant)
        features['city_encoded'] = self.get_target_encoding('city', transaction.get('city', ''))
        features['state_encoded'] = self.get_target_encoding('state', transaction.get('state', ''))
        features['acct_num_encoded'] = self.get_target_encoding('acct_num', acct_num)
        features['ssn_encoded'] = self.get_target_encoding('ssn', ssn)
        
        return features
    
    def update_state(self, transaction: Dict[str, Any]):
        """
        Update all state collections after processing a transaction.
        
        This method performs atomic updates using MongoDB's upsert operations.
        Each entity (card, user, account, merchant) is updated independently.
        
        Args:
            transaction: Raw transaction dictionary
        """
        cc_num = str(transaction.get('cc_num', ''))
        ssn = str(transaction.get('ssn', ''))
        acct_num = str(transaction.get('acct_num', ''))
        merchant = transaction.get('merchant', '')
        unix_time = int(transaction.get('unix_time', 0))
        amt = float(transaction.get('amt', 0.0))
        
        try:
            # Update card state
            self._update_card_state(cc_num, unix_time, amt)
            
            # Update user state
            self._update_user_state(ssn, unix_time, amt)
            
            # Update account state
            self._update_account_state(acct_num, cc_num)
            
            # Update merchant state
            self._update_merchant_state(merchant, cc_num)
            
        except Exception as e:
            print(f"⚠ Error updating state: {e}")
    
    def _update_card_state(self, cc_num: str, unix_time: int, amt: float):
        """Update card state with new transaction."""
        # Get current state
        current_state = self.get_card_state(cc_num)
        
        # Update transaction count and amounts
        transaction_count = current_state.get("transaction_count", 0) + 1
        total_amount = current_state.get("total_amount", 0.0) + amt
        avg_amount = total_amount / transaction_count
        
        # Update velocity windows (keep only recent transactions)
        transactions_15min = [t for t in current_state.get("transactions_15min", []) if unix_time - t < 900]
        transactions_15min.append(unix_time)
        
        transactions_1hr = [t for t in current_state.get("transactions_1hr", []) if unix_time - t < 3600]
        transactions_1hr.append(unix_time)
        
        transactions_24hr = [t for t in current_state.get("transactions_24hr", []) if unix_time - t < 86400]
        transactions_24hr.append(unix_time)
        
        # Upsert card state
        self.card_state.update_one(
            {"cc_num": cc_num},
            {
                "$set": {
                    "last_transaction_time": unix_time,
                    "transaction_count": transaction_count,
                    "total_amount": total_amount,
                    "avg_amount": avg_amount,
                    "transactions_15min": transactions_15min[-100:],  # Keep last 100
                    "transactions_1hr": transactions_1hr[-100:],
                    "transactions_24hr": transactions_24hr[-200:]
                }
            },
            upsert=True
        )
    
    def _update_user_state(self, ssn: str, unix_time: int, amt: float):
        """Update user (SSN) state with new transaction."""
        current_state = self.get_user_state(ssn)
        
        # Update transaction count and amounts
        transaction_count = current_state.get("transaction_count", 0) + 1
        total_amount = current_state.get("total_amount", 0.0) + amt
        avg_amount = total_amount / transaction_count
        max_amount = max(current_state.get("max_amount", 0.0), amt)
        
        # Upsert user state
        self.user_state.update_one(
            {"ssn": ssn},
            {
                "$set": {
                    "last_transaction_time": unix_time,
                    "transaction_count": transaction_count,
                    "total_amount": total_amount,
                    "avg_amount": avg_amount,
                    "max_amount": max_amount
                }
            },
            upsert=True
        )
    
    def _update_account_state(self, acct_num: str, cc_num: str):
        """Update account state with card association."""
        # Use MongoDB's $addToSet to atomically add card to unique set
        self.account_state.update_one(
            {"acct_num": acct_num},
            {
                "$addToSet": {"unique_cards": cc_num}
            },
            upsert=True
        )
    
    def _update_merchant_state(self, merchant: str, cc_num: str):
        """Update merchant state with card association."""
        # Use MongoDB's $addToSet to atomically add card to unique set
        self.merchant_state.update_one(
            {"merchant": merchant},
            {
                "$addToSet": {"unique_cards": cc_num}
            },
            upsert=True
        )
    
    def close(self):
        """Close MongoDB connection."""
        self.client.close()
        print("✓ StateManager connection closed")

