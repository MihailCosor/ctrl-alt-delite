# --- IMPORTS ---
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report
import warnings
import joblib
import os

warnings.filterwarnings('ignore')

# --- 0. Define File Paths ---
file_path = '/kaggle/input/database2/hackathon_train.csv'
# New model name for the simplified feature set
model_filename = 'model_robica_4.0.joblib'

# --- 1. Load Data ---
print(f"Loading data from {file_path}...")
try:
    df = pd.read_csv(file_path, delimiter='|')
except Exception as e:
    print(f"Error loading file: {e}")
    exit()

print(f"Data loaded. Shape: {df.shape}")


# --- 2. Feature Engineering (Simplified Set) ---
print("Starting feature engineering for simplified model...")

def haversine(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(pd.to_numeric, [lat1, lon1, lat2, lon2])
    mask = pd.isna(lat1) | pd.isna(lon1) | pd.isna(lat2) | pd.isna(lon2)
    coords = [lon1, lat1, lon2, lat2]
    rad_coords = [np.where(mask, np.nan, np.radians(c)) for c in coords]
    lon1, lat1, lon2, lat2 = rad_coords
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    a = np.clip(a, 0, 1)
    c = 2 * np.arcsin(np.sqrt(a))
    r = 6371
    return c * r

print("Creating datetime column...")
try:
    # --- Using trans_date and trans_time ---
    df['trans_datetime'] = pd.to_datetime(df['trans_date'] + ' ' + df['trans_time'], errors='coerce')
    if df['trans_datetime'].isnull().any():
        print(f"Warning: {df['trans_datetime'].isnull().sum()} rows dropped due to invalid date/time.")
        df.dropna(subset=['trans_datetime'], inplace=True)
except KeyError as e:
     # --- Fallback to unix_time if trans_date/time missing ---
    if 'unix_time' in df.columns:
        print(f"Warning: Missing 'trans_date' or 'trans_time'. Using 'unix_time'. Error: {e}")
        df['trans_datetime'] = pd.to_datetime(df['unix_time'], unit='s', errors='coerce')
        if df['trans_datetime'].isnull().any():
            print(f"Warning: {df['trans_datetime'].isnull().sum()} rows dropped due to invalid unix_time.")
            df.dropna(subset=['trans_datetime'], inplace=True)
    else:
        print(f"Error: Missing required time columns ('trans_date'/'trans_time' or 'unix_time'). Cannot proceed.")
        exit()

# Basic Features needed for the Top 10
df['dob'] = pd.to_datetime(df['dob'], errors='coerce')
df['hour_of_day'] = df['trans_datetime'].dt.hour
df['day_of_week'] = df['trans_datetime'].dt.dayofweek
df['age'] = (df['trans_datetime'] - df['dob']).dt.days / 365.25
df['distance_km'] = haversine(df['lat'], df['long'], df['merch_lat'], df['merch_long'])

# Simple History Features needed for the Top 10
print("Calculating simple history features...")
df = df.sort_values(by=['ssn', 'trans_datetime'])
grouped_user = df.groupby('ssn')
df['time_since_last_user_trans'] = grouped_user['trans_datetime'].diff().dt.total_seconds()
df['user_trans_count'] = grouped_user.cumcount()

# Merchant History Feature needed for Top 10
print("Calculating merchant history feature...")
df = df.sort_values(by=['merchant', 'trans_datetime']) # Sort for merchant history
grouped_merchant = df.groupby('merchant')
merchant_amt_shifted = grouped_merchant['amt'].shift(1)
df['merchant_avg_amt_so_far'] = merchant_amt_shifted.groupby(df['merchant']).transform(lambda x: x.expanding().mean())

# Final Sort & Fill for the selected features
df = df.sort_values(by=['ssn', 'trans_datetime']) # Sort back
print("Filling NaNs for selected features...")
fill_values = {
    'age': df['age'].median(),
    'distance_km': df['distance_km'].median(),
    'time_since_last_user_trans': 30*24*60*60, # Large default gap
    'merchant_avg_amt_so_far': df['amt'].mean() # Global mean amt if no merchant history
}
df.fillna(fill_values, inplace=True)
# Ensure amt itself has no NaNs (fill with 0 or median if necessary)
if df['amt'].isnull().any():
    df['amt'].fillna(0, inplace=True)
# Ensure city_pop has no NaNs
if 'city_pop' in df.columns and df['city_pop'].isnull().any():
     df['city_pop'].fillna(df['city_pop'].median(), inplace=True)


print("Simplified features created.")


# --- 4. Final Preprocessing & Splitting ---
print("Cleaning up and selecting features...")

y = df['is_fraud']

# --- Define the simplified feature set ---
cols_to_keep_simplified = [
    'age',
    'hour_of_day',
    'merchant_avg_amt_so_far',
    'amt',
    'time_since_last_user_trans',
    'user_trans_count',
    'category',
    'city_pop',
    'distance_km',
    'day_of_week',
    'gender' # Included as it's simple, though lower importance
]
# Select only existing columns from the list
final_feature_cols = [col for col in cols_to_keep_simplified if col in df.columns]
X = df[final_feature_cols].copy()


# --- Check for remaining NaNs in the final feature set X ---
final_nans_in_X = X.isnull().sum()
if final_nans_in_X.sum() > 0:
    print("\nWarning: NaNs found in final feature set X:")
    print(final_nans_in_X[final_nans_in_X > 0])
    # Fill remaining numeric NaNs with median, others with a placeholder or mode
    numeric_cols_in_X = X.select_dtypes(include=np.number).columns
    X.fillna(X[numeric_cols_in_X].median(), inplace=True)
    # Fill remaining non-numeric NaNs (e.g., category if missed)
    object_cols_in_X = X.select_dtypes(include='object').columns
    for col in object_cols_in_X:
        X[col].fillna(X[col].mode()[0] if not X[col].mode().empty else 'Missing', inplace=True)
    print("Filled remaining NaNs in X.")
    if X.isnull().sum().sum() > 0:
        print("ERROR: NaNs persist. Stopping.")
        exit()


# Define categorical features *within the selected set*
categorical_features = [
    'category', 'hour_of_day', 'day_of_week', 'gender'
]

valid_categorical_features = []
for col in categorical_features:
    if col in X.columns:
        # Ensure correct type before converting to category
        if X[col].dtype == 'object':
             X[col] = X[col].astype(str)
        elif not pd.api.types.is_categorical_dtype(X[col]): # Handle numerical types intended as categorical
             X[col] = X[col].astype(str) # Convert to string first
        X[col] = X[col].astype('category')
        valid_categorical_features.append(col)
    else:
        print(f"Warning: Categorical feature '{col}' not found in X.")


X_train, X_val, y_train, y_val = train_test_split(
    X, y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print(f"Train set: {X_train.shape}, Validation set: {X_val.shape}")
print(f"Features used: {X_train.columns.tolist()}")


# ========================================================
# --- 5. Load Model if it exists, else Train (Simplified Model) ---
# ========================================================

if os.path.exists(model_filename):
    print(f"\nModel file '{model_filename}' found. Loading model...")
    lgbm = joblib.load(model_filename)
    print("Model loaded successfully.")

else:
    print(f"\nModel file '{model_filename}' not found. Training new SIMPLIFIED model...")

    if (y_train == 1).sum() == 0:
        print("Error: No positive samples (fraud=1) found.")
        scale_pos_weight = 1
    else:
        scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    print(f"Calculated scale_pos_weight: {scale_pos_weight:.2f}")

    # Use reasonable default parameters for the simpler model
    params = {
        'learning_rate': 0.05,
        'num_leaves': 31,
        'max_depth': -1, # Default: no limit, often works well with num_leaves
        'colsample_bytree': 0.8,
        'subsample': 0.8,
        'reg_alpha': 0.1,
        'reg_lambda': 0.1,
        'min_child_samples': 20 # Default
    }

    lgbm = lgb.LGBMClassifier(
        objective='binary', metric='auc', scale_pos_weight=scale_pos_weight,
        n_estimators=2000, n_jobs=-1, random_state=42,
        **params # Use the defined simpler parameters
    )

    categorical_fit_param = [col for col in valid_categorical_features if col in X_train.columns]
    if not categorical_fit_param:
        categorical_fit_param = 'auto'

    print("Starting model training...")
    try:
        lgbm.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            eval_metric='auc',
            callbacks=[lgb.early_stopping(100, verbose=True)], # Standard early stopping
            categorical_feature=categorical_fit_param
        )
    except Exception as e:
        print(f"Error during model training: {e}")
        exit()

    print(f"\nSaving model to {model_filename}...")
    try:
        joblib.dump(lgbm, model_filename)
        print("Model saved successfully.")
    except Exception as e:
        print(f"Error saving model: {e}")


# ========================================================
# --- 6. Model Evaluation ---
# ========================================================
print("\nEvaluating model performance on validation set...")

if 'lgbm' not in locals():
    print("Error: Model was not loaded or trained successfully.")
    exit()

try:
    y_pred_proba = lgbm.predict_proba(X_val)[:, 1]
except Exception as e:
    print(f"Error during prediction: {e}")
    exit()

# Evaluate with a standard threshold first
threshold = 0.5
new_y_pred_binary_05 = (y_pred_proba > threshold).astype(int)

# Evaluate with the higher threshold too
threshold_high = 0.9
new_y_pred_binary_09 = (y_pred_proba > threshold_high).astype(int)


if len(np.unique(y_val)) > 1:
    auc_score = roc_auc_score(y_val, y_pred_proba)
    pr_auc_score = average_precision_score(y_val, y_pred_proba)

    print("-" * 30)
    print(f"Validation AUC-ROC: {auc_score:.4f}")
    print(f"Validation Average Precision (PR-AUC): {pr_auc_score:.4f}")
    print("-" * 30)
    print(f"\nClassification Report (at {threshold} threshold):")
    print(classification_report(y_val, new_y_pred_binary_05, target_names=['Not Fraud (0)', 'Fraud (1)']))
    print("-" * 30)
    print(f"\nClassification Report (at {threshold_high} threshold):")
    print(classification_report(y_val, new_y_pred_binary_09, target_names=['Not Fraud (0)', 'Fraud (1)']))

else:
    print("Warning: Only one class present in y_val. Cannot calculate metrics.")

print("\nFeature Importances:")
try:
    feature_names = X_train.columns
    if hasattr(lgbm, 'feature_importances_') and len(lgbm.feature_importances_) == len(feature_names):
        feat_imp = pd.Series(lgbm.feature_importances_, index=feature_names).sort_values(ascending=False)
        print(feat_imp)
    else:
        print("Could not retrieve or align feature importances.")
except Exception as e:
    print(f"Error getting feature importances: {e}")