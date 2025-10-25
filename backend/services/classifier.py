import joblib
import os
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
from datetime import datetime
from geopy.distance import great_circle
from .state_manager import StateManager

class TransactionClassifier:
    """Wrapper for the transaction classification model."""
    
    def __init__(self, model_path: str = "classifiers/model_corina_1.0.joblib", 
                 threshold: float = 0.9, 
                 verbose: bool = False,
                 state_manager: Optional[StateManager] = None):
        """
        Initialize the classifier by loading the pretrained model.
        
        Args:
            model_path: Path to the trained model file
            threshold: Classification threshold
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
        """Load the pretrained model from disk."""
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
            return 0
        
        try:
            # Extract features from transaction
            features_df = self._extract_features(transaction)
            print(f"   Extracted features for transaction {transaction.get('trans_num', '?')}")
            # Print features differently depending on context
            if self.verbose:
                # Verbose: full DataFrame with types (good for local debugging)
                try:
                    pd.set_option('display.max_columns', None)
                    pd.set_option('display.width', 200)
                    print(f"   Features for transaction {transaction.get('trans_num', '?')}:")
                    print(features_df.to_string(index=False))
                    print("   Dtypes:", features_df.dtypes.to_dict())
                finally:
                    pd.reset_option('display.max_columns')
                    pd.reset_option('display.width')
            else:
                # Non-verbose: compact single-line summary (safe for logs)
                row = features_df.iloc[0].to_dict()
                compact = {}
                for k, v in row.items():
                    if isinstance(v, (float, np.floating)):
                        compact[k] = round(float(v), 4)
                    else:
                        compact[k] = v
                print(f"   Features (compact): {compact}")
            
            # Get prediction probability
            proba = self.model.predict_proba(features_df)[0, 1]
            
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
        """Calculate distance between two geographic points."""
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
        Extract features from transaction for the model.
        Follows the feature engineering from corina_1.0.py
        
        Uses StateManager to compute stateful features when available.
        """
        
        # Extract basic fields and convert to proper numeric types
        # Transaction data comes from JSON as strings, need explicit conversion
        lat = float(transaction.get('lat', 0.0))
        long = float(transaction.get('long', 0.0))
        city_pop = int(transaction.get('city_pop', 0))
        merch_lat = float(transaction.get('merch_lat', 0.0))
        merch_long = float(transaction.get('merch_long', 0.0))
        amt = float(transaction.get('amt', 0.0))
        
        # Time features
        unix_time = int(transaction.get('unix_time', 0)) if transaction.get('unix_time') else 0
        if unix_time:
            dt = datetime.fromtimestamp(unix_time)
            print(f"   Transaction datetime: {dt.isoformat()}")
            hour = int(dt.hour)
            day_of_week = int(dt.weekday())
        else:
            hour = 0
            day_of_week = 0
        
        # Calculate distance
        dist_km = float(self._calculate_distance(lat, long, merch_lat, merch_long))
        
        # Merchant name heuristic
        merchant = transaction.get('merchant', '')
        is_merchant_suspicious = 1 if 'fraud_' in merchant.lower() else 0
        
        # Stateful features: Use state manager if available, otherwise use defaults
        if self.state_manager is not None:
            # Compute stateful features from MongoDB state
            stateful_features = self.state_manager.compute_features(transaction)
            
            # Extract individual features
            abatere_suma_factor = stateful_features.get('ABATERE_SUMA_FACTOR', 1.0)
            viteza_900 = stateful_features.get('VITEZA_900_CARD', 0.0)
            viteza_3600 = stateful_features.get('VITEZA_3600_CARD', 0.0)
            viteza_86400 = stateful_features.get('VITEZA_86400_CARD', 0.0)
            timp_ultima_trx = stateful_features.get('TIMP_DE_LA_ULTIMA_TRX_SEC_CARD', 86400 * 30)
            nr_carduri_cont = stateful_features.get('NR_CARDURI_PE_CONT', 1.0)
            nr_carduri_merchant = stateful_features.get('NR_CARDURI_PE_MERCHANT', 1.0)
            time_since_last_user_trans = stateful_features.get('time_since_last_user_trans', 86400 * 30)
            user_trans_count = stateful_features.get('user_trans_count', 0.0)
            user_avg_amt = stateful_features.get('user_avg_amt_so_far', amt)
            user_max_amt = stateful_features.get('user_max_amt_so_far', amt)
            amt_vs_user_avg_ratio = stateful_features.get('amt_vs_user_avg_ratio', 1.0)
            is_over_user_max = stateful_features.get('is_over_user_max_amt', 0)
            
            # Target encodings
            merchant_encoded = stateful_features.get('merchant_encoded', 0.0029)
            city_encoded = stateful_features.get('city_encoded', 0.0029)
            state_encoded = stateful_features.get('state_encoded', 0.0029)
            acct_num_encoded = stateful_features.get('acct_num_encoded', 0.0029)
            ssn_encoded = stateful_features.get('ssn_encoded', 0.0029)
        else:
            # Fallback to default values (stateless mode - will produce poor predictions)
            print("⚠ WARNING: StateManager not available, using default stateless features")
            abatere_suma_factor = 1.0
            viteza_900 = 0.0
            viteza_3600 = 0.0
            viteza_86400 = 0.0
            timp_ultima_trx = float(86400 * 30)
            nr_carduri_cont = 1.0
            nr_carduri_merchant = 1.0
            time_since_last_user_trans = float(86400 * 30)
            user_trans_count = 0.0
            user_avg_amt = float(amt)
            user_max_amt = float(amt)
            amt_vs_user_avg_ratio = 1.0
            is_over_user_max = 0
            
            # Target encodings (defaults)
            merchant_encoded = 0.0029
            city_encoded = 0.0029
            state_encoded = 0.0029
            acct_num_encoded = 0.0029
            ssn_encoded = 0.0029
        
        # Numerical features (in the order they were trained)
        numerical_data = {
            'lat': lat,
            'long': long,
            'city_pop': city_pop,
            'merch_lat': merch_lat,
            'merch_long': merch_long,
            'amt': amt,
            'hour': hour,
            'day_of_week': day_of_week,
            'DIST_KM_TRX': dist_km,
            'ABATERE_SUMA_FACTOR': abatere_suma_factor,
            'VITEZA_900_CARD': viteza_900,
            'VITEZA_3600_CARD': viteza_3600,
            'VITEZA_86400_CARD': viteza_86400,
            'TIMP_DE_LA_ULTIMA_TRX_SEC_CARD': timp_ultima_trx,
            'NR_CARDURI_PE_CONT': nr_carduri_cont,
            'NR_CARDURI_PE_MERCHANT': nr_carduri_merchant,
            'time_since_last_user_trans': time_since_last_user_trans,
            'user_trans_count': user_trans_count,
            'user_avg_amt_so_far': user_avg_amt,
            'user_max_amt_so_far': user_max_amt,
            'amt_vs_user_avg_ratio': amt_vs_user_avg_ratio,
            'is_merchant_name_suspicious': is_merchant_suspicious,
            'is_over_user_max_amt': is_over_user_max
        }
        
        # Categorical features - using target encodings from state manager or defaults
        categorical_data = {
            'merchant_encoded': merchant_encoded,
            'city_encoded': city_encoded,
            'state_encoded': state_encoded,
            'acct_num_encoded': acct_num_encoded,
            'ssn_encoded': ssn_encoded
        }
        
        # One-hot encoded features (gender and category)
        # Defaults to all False (reference categories)
        gender = transaction.get('gender', 'M')
        category = transaction.get('category', 'misc_net')
        
        # Gender one-hot (assuming drop_first=True, so only 'M' is kept)
        categorical_data['gender_M'] = 1 if gender == 'M' else 0
        
        # Category one-hot - exact list from the model
        # (drop_first=True was used during training, so first category alphabetically was dropped)
        category_features = [
            'category_food_dining',
            'category_gas_transport',
            'category_grocery_net',
            'category_grocery_pos',
            'category_health_fitness',
            'category_home',
            'category_kids_pets',
            'category_misc_net',
            'category_misc_pos',
            'category_personal_care',
            'category_shopping_net',
            'category_shopping_pos',
            'category_travel'
        ]
        
        # Initialize all category features to 0
        for cat_feature in category_features:
            cat_name = cat_feature.replace('category_', '')
            categorical_data[cat_feature] = 1 if category == cat_name else 0
        
        # Combine all features
        all_features = {**numerical_data, **categorical_data}
        
        # Create DataFrame with single row
        df = pd.DataFrame([all_features])
        
        # Explicitly convert all columns to numeric types (XGBoost requirement)
        # Numerical features should be float
        numeric_cols = [
            'lat', 'long', 'city_pop', 'merch_lat', 'merch_long', 'amt', 
            'hour', 'day_of_week', 'DIST_KM_TRX', 'ABATERE_SUMA_FACTOR',
            'VITEZA_900_CARD', 'VITEZA_3600_CARD', 'VITEZA_86400_CARD',
            'TIMP_DE_LA_ULTIMA_TRX_SEC_CARD', 'NR_CARDURI_PE_CONT', 
            'NR_CARDURI_PE_MERCHANT', 'time_since_last_user_trans', 
            'user_trans_count', 'user_avg_amt_so_far', 'user_max_amt_so_far',
            'amt_vs_user_avg_ratio', 'is_merchant_name_suspicious', 
            'is_over_user_max_amt', 'merchant_encoded', 'city_encoded',
            'state_encoded', 'acct_num_encoded', 'ssn_encoded'
        ]
        
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(float)
        
        # Binary/categorical features should be int
        binary_cols = ['gender_M'] + [col for col in df.columns if col.startswith('category_')]
        for col in binary_cols:
            if col in df.columns:
                df[col] = df[col].astype(int)
        
        # Ensure columns are in the exact order the model expects
        expected_column_order = [
            'lat', 'long', 'city_pop', 'merch_lat', 'merch_long', 'amt', 
            'hour', 'day_of_week', 'DIST_KM_TRX', 'ABATERE_SUMA_FACTOR',
            'VITEZA_900_CARD', 'VITEZA_3600_CARD', 'VITEZA_86400_CARD',
            'TIMP_DE_LA_ULTIMA_TRX_SEC_CARD', 'NR_CARDURI_PE_CONT', 
            'NR_CARDURI_PE_MERCHANT', 'time_since_last_user_trans', 
            'user_trans_count', 'user_avg_amt_so_far', 'user_max_amt_so_far',
            'amt_vs_user_avg_ratio', 'is_merchant_name_suspicious', 
            'is_over_user_max_amt', 'merchant_encoded', 'city_encoded',
            'state_encoded', 'acct_num_encoded', 'ssn_encoded', 'gender_M',
            'category_food_dining', 'category_gas_transport', 'category_grocery_net',
            'category_grocery_pos', 'category_health_fitness', 'category_home',
            'category_kids_pets', 'category_misc_net', 'category_misc_pos',
            'category_personal_care', 'category_shopping_net', 'category_shopping_pos',
            'category_travel'
        ]
        
        # Reorder columns to match model expectations
        df = df[expected_column_order]
        
        # Store feature columns for reference
        if self.feature_columns is None:
            self.feature_columns = df.columns.tolist()
        
        return df

