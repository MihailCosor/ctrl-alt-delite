import joblib
import os
from typing import Dict, Any

class TransactionClassifier:
    """Wrapper for the transaction classification model."""
    
    def __init__(self, model_path: str = "classifiers/model_corina_1.0.joblib"):
        """Initialize the classifier by loading the pretrained model."""
        self.model = None
        self.model_path = model_path
        self.load_model()
    
    def load_model(self):
        """Load the pretrained model from disk."""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                print(f"✓ Model loaded successfully from {self.model_path}")
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
            Classification value (0 or 1, depending on your model)
        """
        if self.model is None:
            return 0
        
        try:
            # TODO: Extract features from transaction based on your model's requirements
            # Example: If your model expects specific fields
            features = self._extract_features(transaction)
            
            # Make prediction
            prediction = self.model.predict([features])[0]
            return int(prediction)
            
        except Exception as e:
            print(f"Error classifying transaction: {e}")
            return 0
    
    def _extract_features(self, transaction: Dict[str, Any]) -> list:
        """
        Extract features from transaction for the model.
        
        Modify this method based on what features your model expects.
        Common transaction fields might include:
        - amount
        - merchant category
        - time of day
        - location
        - etc.
        """
        # Example - modify this based on your actual model's input format
        # This is just a placeholder - you need to match your training data format
        
        # If you're unsure about the format, you can inspect the transaction
        # and return features in the same order as during training
        features = []
        
        # Example fields (adjust to match your model):
        # features.append(transaction.get('amount', 0))
        # features.append(transaction.get('merchant_category', 0))
        # features.append(transaction.get('hour', 0))
        
        return features

