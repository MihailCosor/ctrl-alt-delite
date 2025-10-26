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
from datetime import datetime, timezone, timedelta
import pymongo
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError
import joblib
import os
import numpy as np
import pandas as pd


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
        
        # Historical training data collection
        self.training_data = self.db.training_data
        
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
        
        Returns state for velocity features (1h, 24h windows).
        """
        state = self.card_state.find_one({"cc_num": cc_num})
        
        if state is None:
            # First transaction for this card
            return {
                "cc_num": cc_num,
                "last_transaction_time": 0,
                "transaction_count": 0,
                "transactions_1hr": [],   # Unix timestamps in last 1 hour
                "transactions_24hr": []   # Unix timestamps in last 24 hours
            }
        
        return state
    
    def get_user_state(self, ssn: str) -> Dict[str, Any]:
        """
        Retrieve user (SSN) state from MongoDB.
        
        Returns state for user transaction patterns including per-category and per-merchant stats.
        """
        state = self.user_state.find_one({"ssn": ssn})
        
        if state is None:
            # First transaction for this user
            return {
                "ssn": ssn,
                "last_transaction_time": 0,
                "last_state": None,
                "transaction_count": 0,
                "total_amount": 0.0,
                "avg_amount": 0.0,
                "max_amount": 0.0,
                "last_5_amounts": [],  # For rolling 5 transaction average
                "category_stats": {},  # {category: {total_amt, count, avg}}
                "merchant_counts": {}  # {merchant: count}
            }
        
        return state
    
    def get_merchant_state(self, merchant: str) -> Dict[str, Any]:
        """
        Retrieve merchant state from MongoDB.
        
        Returns merchant transaction statistics.
        """
        state = self.merchant_state.find_one({"merchant": merchant})
        
        if state is None:
            return {
                "merchant": merchant,
                "transaction_count": 0,
                "total_amount": 0.0,
                "avg_amount": 0.0
            }
        
        return state
    
    def compute_features(self, transaction: Dict[str, Any]) -> Dict[str, float]:
        """
        Compute stateful features for a transaction using historical MongoDB queries.
        
        This method replicates the feature engineering from robica_2.0.py
        by querying the training_data collection for historical features.
        
        Args:
            transaction: Transaction data
            
        Returns:
            Dictionary of computed features
        """
        # Extract basic transaction info
        ssn = transaction.get('ssn', '')
        cc_num = transaction.get('cc_num', '')
        merchant = transaction.get('merchant', '')
        amt = float(transaction.get('amt', 0))
        category = transaction.get('category', '')
        state_name = transaction.get('state', '')
        
        # Construct trans_datetime from trans_date and trans_time (like training script)
        trans_date = transaction.get('trans_date', '')
        trans_time = transaction.get('trans_time', '')
        
        if trans_date and trans_time:
            try:
                # Combine date and time like in training script: df['trans_datetime'] = pd.to_datetime(df['trans_date'] + ' ' + df['trans_time'])
                datetime_str = f"{trans_date} {trans_time}"
                trans_datetime = pd.to_datetime(datetime_str, errors='coerce')
                if pd.isna(trans_datetime):
                    trans_datetime = datetime.now()
            except:
                trans_datetime = datetime.now()
        else:
            # Fallback: try to get trans_datetime directly if it exists
            trans_datetime = transaction.get('trans_datetime', '')
            if isinstance(trans_datetime, str):
                try:
                    trans_datetime = datetime.fromisoformat(trans_datetime.replace('Z', '+00:00'))
                except:
                    trans_datetime = datetime.now()
            elif not isinstance(trans_datetime, datetime):
                trans_datetime = datetime.now()
        
        features = {}
        
        # Helper function to convert trans_date + trans_time to datetime
        def get_trans_datetime(trans):
            trans_date = trans.get('trans_date')
            trans_time = trans.get('trans_time')
            if trans_date and trans_time:
                try:
                    datetime_str = f"{trans_date} {trans_time}"
                    dt = pd.to_datetime(datetime_str)
                    return dt
                except Exception as e:
                    print(f"Error parsing datetime: {e}")
                    return datetime.now()
            return datetime.now()
        # Get all transactions for this user and filter by time
        all_user_trans = list(self.training_data.find(
            {"ssn": ssn},
            {"trans_date": 1, "trans_time": 1, "amt": 1, "merchant": 1, "category": 1, "state": 1}
        ))
        print(f"for ssn {ssn} found {len(all_user_trans)} transactions")
        
        # Filter to only previous transactions (before current transaction time)
        # user_prev_trans = []
        # for trans in all_user_trans:
        #     trans_dt = get_trans_datetime(trans)
        #     if trans_dt and not pd.isna(trans_dt) and trans_dt < trans_datetime:
        #         user_prev_trans.append(trans)
        user_prev_trans = all_user_trans
        
        # Sort by datetime
        user_prev_trans.sort(key=lambda x: get_trans_datetime(x) or datetime.min)
        
        # === USER HISTORY FEATURES ===
        
        # 1. time_since_last_user_trans
        if user_prev_trans:
            last_trans_dt = get_trans_datetime(user_prev_trans[-1])
            if last_trans_dt:
                time_diff = (trans_datetime - last_trans_dt).total_seconds()
                features['time_since_last_user_trans'] = float(time_diff)
            else:
                features['time_since_last_user_trans'] = 30*24*60*60
        else:
            features['time_since_last_user_trans'] = 30*24*60*60
        
        # 2. user_trans_count
        features['user_trans_count'] = float(len(user_prev_trans))
        
        # 3. user_avg_amt_so_far
        if user_prev_trans:
            amounts = [float(t.get('amt', 0)) for t in user_prev_trans if t.get('amt') is not None and t.get('amt') != '']
            if amounts and len(amounts) > 0:
                features['user_avg_amt_so_far'] = float(sum(amounts) / len(amounts))
            else:
                features['user_avg_amt_so_far'] = float(amt)
        else:
            features['user_avg_amt_so_far'] = float(amt)
        
        # 4. user_max_amt_so_far
        if user_prev_trans:
            amounts = [float(t.get('amt', 0)) for t in user_prev_trans if t.get('amt') is not None and t.get('amt') != '']
            if amounts and len(amounts) > 0:
                features['user_max_amt_so_far'] = float(max(amounts))
            else:
                features['user_max_amt_so_far'] = float(amt)
        else:
            features['user_max_amt_so_far'] = float(amt)
        
        # 5. amt_vs_user_avg_ratio
        user_avg = features['user_avg_amt_so_far']
        if user_avg > 0.01:
            ratio = amt / user_avg
            features['amt_vs_user_avg_ratio'] = min(float(ratio), 999.0)
        else:
            features['amt_vs_user_avg_ratio'] = 1.0
        
        # 6. is_over_user_max_amt
        user_max = features['user_max_amt_so_far']
        features['is_over_user_max_amt'] = 1 if amt > user_max else 0
        
        # 7. user_avg_amt_last_5_trans
        last_5_trans = user_prev_trans[-5:] if len(user_prev_trans) >= 5 else user_prev_trans
        if last_5_trans:
            amounts = [float(t.get('amt', 0)) for t in last_5_trans if t.get('amt') is not None and t.get('amt') != '']
            if amounts and len(amounts) > 0:
                features['user_avg_amt_last_5_trans'] = float(sum(amounts) / len(amounts))
            else:
                features['user_avg_amt_last_5_trans'] = float(amt)
        else:
            features['user_avg_amt_last_5_trans'] = float(amt)
        
        # 8. user_merchant_trans_count
        user_merchant_count = sum(1 for t in user_prev_trans if t.get('merchant') == merchant)
        features['user_merchant_trans_count'] = float(user_merchant_count)
        
        # 9. is_new_merchant_for_user
        features['is_new_merchant_for_user'] = 1 if user_merchant_count == 0 else 0
        
        # 10. user_avg_amt_category_so_far
        user_category_trans = [t for t in user_prev_trans if t.get('category') == category]
        if user_category_trans:
            amounts = [float(t.get('amt', 0)) for t in user_category_trans if t.get('amt') is not None and t.get('amt') != '']
            if amounts and len(amounts) > 0:
                cat_avg = sum(amounts) / len(amounts)
                features['user_avg_amt_category_so_far'] = float(cat_avg)
                # 11. amt_vs_user_category_avg
                ratio = amt / max(cat_avg, 0.01)
                features['amt_vs_user_category_avg'] = min(float(ratio), 999.0)
            else:
                features['user_avg_amt_category_so_far'] = float(amt)
                features['amt_vs_user_category_avg'] = 1.0
        else:
            features['user_avg_amt_category_so_far'] = float(amt)
            features['amt_vs_user_category_avg'] = 1.0
        
        # 12. is_new_state
        if user_prev_trans:
            last_state = user_prev_trans[-1].get('state')
            features['is_new_state'] = 1 if (last_state and last_state != state_name) else 0
        else:
            features['is_new_state'] = 0
        
        # === CARD VELOCITY FEATURES ===
        
        # Get all transactions for this card
        all_card_trans = list(self.training_data.find(
            {"cc_num": cc_num},
            {"trans_date": 1, "trans_time": 1}
        ))
        
        # Filter to time windows
        one_hour_ago = trans_datetime - timedelta(hours=1)
        one_day_ago = trans_datetime - timedelta(hours=24)
        
        cc_1h_count = 0
        cc_24h_count = 0
        
        for trans in all_card_trans:
            trans_dt = get_trans_datetime(trans)
            if trans_dt and not pd.isna(trans_dt) and trans_dt < trans_datetime:
                if trans_dt >= one_hour_ago:
                    cc_1h_count += 1
                if trans_dt >= one_day_ago:
                    cc_24h_count += 1
        
        # 13. cc_num_count_last_1h
        features['cc_num_count_last_1h'] = float(cc_1h_count)
        
        # 14. cc_num_count_last_24h
        features['cc_num_count_last_24h'] = float(cc_24h_count)
        
        # === MERCHANT FEATURES ===
        
        # Get all transactions for this merchant
        all_merchant_trans = list(self.training_data.find(
            {"merchant": merchant},
            {"trans_date": 1, "trans_time": 1, "amt": 1}
        ))
        
        # Filter to previous transactions
        merchant_prev_trans = []
        for trans in all_merchant_trans:
            trans_dt = get_trans_datetime(trans)
            if trans_dt and not pd.isna(trans_dt) and trans_dt < trans_datetime:
                merchant_prev_trans.append(trans)
        
        # 15. merchant_avg_amt_so_far
        if merchant_prev_trans:
            amounts = [float(t.get('amt', 0)) for t in merchant_prev_trans if t.get('amt') is not None and t.get('amt') != '']
            if amounts and len(amounts) > 0:
                features['merchant_avg_amt_so_far'] = float(sum(amounts) / len(amounts))
            else:
                features['merchant_avg_amt_so_far'] = float(amt)
        else:
            features['merchant_avg_amt_so_far'] = float(amt)
        
        # 16. amt_vs_merchant_avg_ratio
        merchant_avg = features['merchant_avg_amt_so_far']
        if merchant_avg > 0.01:
            ratio = amt / merchant_avg
            features['amt_vs_merchant_avg_ratio'] = min(float(ratio), 999.0)
        else:
            features['amt_vs_merchant_avg_ratio'] = 1.0
        
        return features
    
    def update_state(self, transaction: Dict[str, Any]):
        """
        Update all state collections after processing a transaction (robica_2.0).
        
        This method performs atomic updates using MongoDB's upsert operations.
        Each entity (card, user, merchant) is updated independently.
        
        Args:
            transaction: Raw transaction dictionary
        """
        cc_num = str(transaction.get('cc_num', ''))
        ssn = str(transaction.get('ssn', ''))
        merchant = transaction.get('merchant', '')
        category = transaction.get('category', '')
        state_name = transaction.get('state', '')
        unix_time = int(transaction.get('unix_time', 0))
        amt = float(transaction.get('amt', 0.0))
        
        try:
            # Update card state
            self._update_card_state(cc_num, unix_time, amt)
            
            # Update user state
            self._update_user_state(ssn, unix_time, amt, merchant, category, state_name)
            
            # Update merchant state
            self._update_merchant_state(merchant, amt)
            
        except Exception as e:
            print(f"⚠ Error updating state: {e}")
    
    def _update_card_state(self, cc_num: str, unix_time: int, amt: float):
        """Update card state with new transaction (robica_2.0)."""
        # Get current state
        current_state = self.get_card_state(cc_num)
        
        # Update transaction count
        transaction_count = current_state.get("transaction_count", 0) + 1
        
        # Update velocity windows (keep only recent transactions)
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
                    "transactions_1hr": transactions_1hr[-100:],  # Keep last 100
                    "transactions_24hr": transactions_24hr[-200:]  # Keep last 200
                }
            },
            upsert=True
        )
    
    def _update_user_state(self, ssn: str, unix_time: int, amt: float, merchant: str, category: str, state_name: str):
        """Update user (SSN) state with new transaction (robica_2.0)."""
        current_state = self.get_user_state(ssn)
        
        # Update transaction count and amounts
        transaction_count = current_state.get("transaction_count", 0) + 1
        total_amount = current_state.get("total_amount", 0.0) + amt
        avg_amount = total_amount / transaction_count
        max_amount = max(current_state.get("max_amount", 0.0), amt)
        
        # Update last 5 amounts (for rolling average)
        last_5_amounts = current_state.get("last_5_amounts", [])
        last_5_amounts.append(amt)
        last_5_amounts = last_5_amounts[-5:]  # Keep only last 5
        
        # Update per-category stats
        category_stats = current_state.get("category_stats", {})
        if category not in category_stats:
            category_stats[category] = {"total_amt": 0.0, "count": 0, "avg": 0.0}
        
        category_stats[category]["total_amt"] += amt
        category_stats[category]["count"] += 1
        category_stats[category]["avg"] = category_stats[category]["total_amt"] / category_stats[category]["count"]
        
        # Update per-merchant counts
        merchant_counts = current_state.get("merchant_counts", {})
        merchant_counts[merchant] = merchant_counts.get(merchant, 0) + 1
        
        # Upsert user state
        self.user_state.update_one(
            {"ssn": ssn},
            {
                "$set": {
                    "last_transaction_time": unix_time,
                    "last_state": state_name,
                    "transaction_count": transaction_count,
                    "total_amount": total_amount,
                    "avg_amount": avg_amount,
                    "max_amount": max_amount,
                    "last_5_amounts": last_5_amounts,
                    "category_stats": category_stats,
                    "merchant_counts": merchant_counts
                }
            },
            upsert=True
        )
    
    def _update_merchant_state(self, merchant: str, amt: float):
        """Update merchant state with transaction (robica_2.0)."""
        current_state = self.get_merchant_state(merchant)
        
        # Update transaction count and amounts
        transaction_count = current_state.get("transaction_count", 0) + 1
        total_amount = current_state.get("total_amount", 0.0) + amt
        avg_amount = total_amount / transaction_count
        
        # Upsert merchant state
        self.merchant_state.update_one(
            {"merchant": merchant},
            {
                "$set": {
                    "transaction_count": transaction_count,
                    "total_amount": total_amount,
                    "avg_amount": avg_amount
                }
            },
            upsert=True
        )
    
    def close(self):
        """Close MongoDB connection."""
        self.client.close()
        print("✓ StateManager connection closed")

