import joblib
import os
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
from datetime import datetime
from geopy.distance import great_circle
from .state_manager import StateManager

class TransactionClassifier:
    """Wrapper for the transaction classification model (robica_2.0 LightGBM)."""
    
    def __init__(self, model_path: str = "classifiers/model_robica_4.0.joblib", 
                 threshold: float = 0.5, 
                 verbose: bool = False,
                 state_manager: Optional[StateManager] = None):
        """
        Initialize the classifier by loading the pretrained model.
        
        Args:
            model_path: Path to the trained model file
            threshold: Classification threshold (default 0.90 from robica_2.0)
            verbose: Enable verbose logging
            state_manager: StateManager instance for stateful feature extraction
        """
        self.model = None
        self.model_path = model_path
        self.threshold = threshold
        self.verbose = verbose
        self.feature_columns = None  # Will be set when we prepare features
        self.state_manager = state_manager  # State manager for stateful features
        self.load_model()
    
    def load_model(self):
        """Load the pretrained LightGBM model from disk."""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                print(f"✓ Model loaded successfully from {self.model_path}")
                print(f"✓ Using prediction threshold: {self.threshold}")
            else:
                print(f"✗ Model file not found at {self.model_path}")
                print("  Falling back to default classification (0)")
        except Exception as e:
            print(f"✗ Error loading model: {e}")
            print("  Falling back to default classification (0)")
    
    def classify(self, transaction: Dict[str, Any]) -> int:
        """
        Classify a transaction.
        
        Args:
            transaction: Dictionary containing transaction data
            
        Returns:
            Classification value (0 = legitimate, 1 = fraudulent)
        """
        if self.model is None:
            print("✗ Model not loaded. Falling back to default classification (0)")
            return 0
        
        try:
            # Extract features from transaction
            features_df = self._extract_features(transaction)
            print(f"   Extracted features for transaction {transaction.get('trans_num', '?')}")
            
            # Print features for debugging
            row = features_df.iloc[0]
            for col in features_df.columns:
                print(f"     {col}: {row[col]}")
            
            
            # Get prediction probability
            proba = self.model.predict_proba(features_df)[0, 1]
            print("Prediction: ", proba)
            
            # Apply threshold
            prediction = 1 if proba >= self.threshold else 0
            
            # Log for debugging (only if verbose)
            if self.verbose:
                print(f"   Prediction proba: {proba:.4f} -> {prediction}")
            
            return int(prediction)
            
        except Exception as e:
            print(f"✗ Error classifying transaction: {e}")
            import traceback
            traceback.print_exc()
            return 0
    
    def _calculate_distance(self, lat1, long1, lat2, long2) -> float:
        """Calculate distance between two geographic points using Haversine formula."""
        try:
            if pd.notna([lat1, long1, lat2, long2]).all():
                if -90 <= lat1 <= 90 and -180 <= long1 <= 180 and \
                   -90 <= lat2 <= 90 and -180 <= long2 <= 180:
                    return great_circle((lat1, long1), (lat2, long2)).km
        except:
            pass
        return 0.0
    
    def _extract_features(self, transaction: Dict[str, Any]) -> pd.DataFrame:
        """
        Extract SIMPLIFIED features from transaction (robica_4.0 model).
        
        Only 11 features are used in EXACT order from robica_4.0.py:
        1. age
        2. hour_of_day
        3. merchant_avg_amt_so_far
        4. amt
        5. time_since_last_user_trans
        6. user_trans_count
        7. category
        8. city_pop
        9. distance_km
        10. day_of_week
        11. gender
        
        This matches the exact format from robica_4.0.py training data.
        """
        
        # === Extract basic fields ===
        lat = float(transaction.get('lat', 0.0))
        long = float(transaction.get('long', 0.0))
        city_pop = int(transaction.get('city_pop', 0))
        merch_lat = float(transaction.get('merch_lat', 0.0))
        merch_long = float(transaction.get('merch_long', 0.0))
        amt = float(transaction.get('amt', 0.0))
        gender = transaction.get('gender', 'M')
        category = transaction.get('category', 'misc_net')
        
        # === Time features ===
        unix_time = int(transaction.get('unix_time', 0)) if transaction.get('unix_time') else 0
        if unix_time:
            dt = datetime.fromtimestamp(unix_time)
            hour_of_day = int(dt.hour)
            day_of_week = int(dt.weekday())
        else:
            hour_of_day = 0
            day_of_week = 0
        
        # === Age calculation ===
        dob_str = transaction.get('dob', '')
        if dob_str:
            try:
                if unix_time:
                    trans_dt = datetime.fromtimestamp(unix_time)
                    dob_dt = pd.to_datetime(dob_str)
                    age = (trans_dt - dob_dt).days / 365.25
                else:
                    age = 0.0
            except:
                age = 0.0
        else:
            age = 0.0
        
        # === Distance calculation ===
        distance_km = float(self._calculate_distance(lat, long, merch_lat, merch_long))
        
        # === Stateful features from state manager ===
        if self.state_manager is not None:
            stateful_features = self.state_manager.compute_features(transaction)
            
            # Extract ONLY the 3 stateful features we need for robica_4.0
            time_since_last_user_trans = stateful_features.get('time_since_last_user_trans', 30*24*60*60)
            user_trans_count = stateful_features.get('user_trans_count', 0.0)
            merchant_avg_amt_so_far = stateful_features.get('merchant_avg_amt_so_far', amt)
        else:
            # Fallback to defaults (stateless mode - will produce poor predictions)
            print("⚠ WARNING: StateManager not available, using default stateless features")
            time_since_last_user_trans = float(30*24*60*60)
            user_trans_count = 0.0
            merchant_avg_amt_so_far = amt
        
        # === Assemble features in EXACT order from robica_4.0.py ===
        # Order: age, hour_of_day, merchant_avg_amt_so_far, amt, time_since_last_user_trans, 
        #        user_trans_count, category, city_pop, distance_km, day_of_week, gender
        features = {
            'age': age,
            'hour_of_day': hour_of_day,
            'merchant_avg_amt_so_far': merchant_avg_amt_so_far,
            'amt': amt,
            'time_since_last_user_trans': time_since_last_user_trans,
            'user_trans_count': user_trans_count,
            'category': category,
            'city_pop': city_pop,
            'distance_km': distance_km,
            'day_of_week': day_of_week,
            'gender': gender
        }
        
        # Create DataFrame
        df = pd.DataFrame([features])
        
        # Convert categorical features to proper types (matching robica_4.0.py)
        categorical_features = [
            'category', 'hour_of_day', 'day_of_week', 'gender'
        ]
        
        for col in categorical_features:
            if col in df.columns:
                # Ensure correct type before converting to category (matching robica_4.0.py lines 158-162)
                if df[col].dtype == 'object':
                    df[col] = df[col].astype(str)
                elif not pd.api.types.is_categorical_dtype(df[col]):  # Handle numerical types intended as categorical
                    df[col] = df[col].astype(str)  # Convert to string first
                df[col] = df[col].astype('category')
        
        # Ensure numeric columns are float
        numeric_cols = [
            'age', 'merchant_avg_amt_so_far', 'amt',
            'time_since_last_user_trans', 'user_trans_count',
            'city_pop', 'distance_km'
        ]
        
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(float)
        
        # Replace inf values
        df.replace([np.inf, -np.inf], 999999, inplace=True)
        
        # Store feature columns for reference
        if self.feature_columns is None:
            self.feature_columns = df.columns.tolist()
        
        return df
