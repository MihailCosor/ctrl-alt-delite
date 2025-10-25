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
# Using a new model name for this specific configuration
model_filename = '/kaggle/working/fraud_model_v7_no_unix_time.joblib'

# --- 1. Load Data ---
print(f"Loading data from {file_path}...")
try:
    df = pd.read_csv(file_path, delimiter='|')
except Exception as e:
    print(f"Error loading file: {e}")
    exit()

print(f"Data loaded. Shape: {df.shape}")


# --- 2. Basic Feature Engineering ---
print("Starting basic feature engineering...")

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
    df['trans_datetime'] = pd.to_datetime(df['trans_date'] + ' ' + df['trans_time'], errors='coerce')
    if df['trans_datetime'].isnull().any():
        print(f"Warning: {df['trans_datetime'].isnull().sum()} rows had invalid date/time formats and were set to NaT.")
        df.dropna(subset=['trans_datetime'], inplace=True)
        print("Rows with invalid datetime dropped.")
except KeyError as e:
    print(f"Error: Missing required columns 'trans_date' or 'trans_time'. Error: {e}")
    exit()

df['dob'] = pd.to_datetime(df['dob'], errors='coerce')
df['hour_of_day'] = df['trans_datetime'].dt.hour
df['day_of_week'] = df['trans_datetime'].dt.dayofweek
df['age'] = (df['trans_datetime'] - df['dob']).dt.days / 365.25
df['distance_km'] = haversine(df['lat'], df['long'], df['merch_lat'], df['merch_long'])
df['is_amt_round_number'] = ((df['amt'] % 1.0 == 0) & (df['amt'] > 0)).astype(int)

print("Basic features created.")


# --- 3. Advanced History-Based Features ---
print("Creating advanced user behavior features...")
df = df.sort_values(by=['ssn', 'trans_datetime'])
grouped_user = df.groupby('ssn')

# User History
df['time_since_last_user_trans'] = grouped_user['trans_datetime'].diff().dt.total_seconds()
df['user_trans_count'] = grouped_user.cumcount()
user_amt_shifted = grouped_user['amt'].shift(1)
df['user_avg_amt_so_far'] = user_amt_shifted.groupby(df['ssn']).transform(lambda x: x.expanding().mean())
df['user_max_amt_so_far'] = user_amt_shifted.groupby(df['ssn']).transform(lambda x: x.expanding().max())
df['amt_vs_user_avg_ratio'] = df['amt'] / df['user_avg_amt_so_far'].clip(lower=0.01)
df['is_over_user_max_amt'] = (df['amt'] > df['user_max_amt_so_far']).astype(int)
df['user_avg_amt_last_5_trans'] = user_amt_shifted.groupby(df['ssn']).transform(lambda x: x.rolling(window=5, min_periods=1).mean())
df['user_merchant_trans_count'] = df.groupby(['ssn', 'merchant']).cumcount()
df['is_new_merchant_for_user'] = (df['user_merchant_trans_count'] == 0).astype(int)

grouped_user_category = df.groupby(['ssn', 'category'])
user_category_amt_shifted = grouped_user_category['amt'].shift(1)
df['user_avg_amt_category_so_far'] = user_category_amt_shifted.groupby([df['ssn'], df['category']]).transform(lambda x: x.expanding().mean())
df['amt_vs_user_category_avg'] = df['amt'] / df['user_avg_amt_category_so_far'].clip(lower=0.01)

df['last_user_state'] = grouped_user['state'].shift(1)
df['is_new_state'] = (df['state'] != df['last_user_state']).astype(int)


# --- Payment Instrument (cc_num) Velocity ---
print("Creating payment velocity features...")
df['cc_num'] = df['cc_num'].astype(str)
df = df.sort_values(by=['cc_num', 'trans_datetime'])

grouped_card_time = df.groupby('cc_num')
if pd.api.types.is_datetime64_any_dtype(df['trans_datetime']):
    rolling_counts_1h = grouped_card_time.rolling('1H', on='trans_datetime', closed='left')['amt'].count()
    df['cc_num_count_last_1h'] = rolling_counts_1h.reset_index(level=0, drop=True).values

    rolling_counts_24h = grouped_card_time.rolling('24H', on='trans_datetime', closed='left')['amt'].count()
    df['cc_num_count_last_24h'] = rolling_counts_24h.reset_index(level=0, drop=True).values

    df['cc_num_count_last_1h'] = df['cc_num_count_last_1h'].fillna(0)
    df['cc_num_count_last_24h'] = df['cc_num_count_last_24h'].fillna(0)
else:
    print("Warning: 'trans_datetime' column not suitable. Velocity features set to 0.")
    df['cc_num_count_last_1h'] = 0
    df['cc_num_count_last_24h'] = 0

# --- Merchant-level Reputation Features ---
print("Creating merchant reputation features...")
df = df.sort_values(by=['merchant', 'trans_datetime'])
grouped_merchant = df.groupby('merchant')
merchant_amt_shifted = grouped_merchant['amt'].shift(1)
df['merchant_avg_amt_so_far'] = merchant_amt_shifted.groupby(df['merchant']).transform(lambda x: x.expanding().mean())
df['amt_vs_merchant_avg_ratio'] = df['amt'] / df['merchant_avg_amt_so_far'].clip(lower=0.01)

# --- Final Sort & Fill ---
df = df.sort_values(by=['ssn', 'trans_datetime'])
print("Filling NaNs...")
fill_values = {
    'age': df['age'].median(), 'distance_km': df['distance_km'].median(),
    'time_since_last_user_trans': 30*24*60*60, 'user_avg_amt_so_far': df['amt'].mean(),
    'user_max_amt_so_far': df['amt'].max(), 'amt_vs_user_avg_ratio': 1,
    'user_avg_amt_last_5_trans': df['amt'].mean(), 'user_avg_amt_category_so_far': df['amt'].mean(),
    'amt_vs_user_category_avg': 1, 'last_user_state': 'UNKNOWN',
    'cc_num_count_last_1h': 0, 'cc_num_count_last_24h': 0,
    'merchant_avg_amt_so_far': df['amt'].mean(), 'amt_vs_merchant_avg_ratio': 1
}
df.replace([np.inf, -np.inf], 999999, inplace=True)
df.fillna(fill_values, inplace=True)

# --- REMOVED NaN CHECK FROM HERE ---

print("Advanced features created.")


# --- 4. Final Preprocessing & Splitting ---
print("Cleaning up and splitting data...")

y = df['is_fraud']
cols_to_drop = [
    'transaction_id', 'ssn', 'cc_num', 'first', 'last', 'street',
    'city', 'state', 'zip', 'job', 'acct_num', 'trans_num',
    'trans_time', 'trans_date',
    'unix_time', # Drop unix_time if it exists and wasn't used
    'dob', 'trans_datetime',
    'lat', 'long', 'merch_lat', 'merch_long', 'merchant', 'profile',
    'is_fraud',
    'user_merchant_trans_count', # Helper col
    'last_user_state'            # Helper col
]
cols_to_drop_present = [col for col in cols_to_drop if col in df.columns]
X = df.drop(columns=cols_to_drop_present, errors='ignore')

# --- MOVED FINAL NaN CHECK HERE ---
# Check *after* creating X and *before* splitting
final_nans_in_X = X.isnull().sum()
if final_nans_in_X.sum() > 0:
    print("\nWarning: NaNs still present in the final feature DataFrame X after initial fills:")
    print(final_nans_in_X[final_nans_in_X > 0])
    # Apply final fillna(0) strategy to remaining numeric columns IN X
    numeric_cols_in_X = X.select_dtypes(include=np.number).columns
    X.fillna(X[numeric_cols_in_X].median(), inplace=True) # Or use .fillna(0)
    print("Filled remaining NaNs in X with column medians.")
    # Re-check
    if X.isnull().sum().sum() > 0:
        print("ERROR: NaNs persist even after final fill. Check data types and fill logic.")
        exit()
# --- END MOVED CHECK ---


categorical_features = [
    'gender', 'category', 'hour_of_day', 'day_of_week',
    'is_over_user_max_amt', 'is_new_merchant_for_user',
    'is_new_state', 'is_amt_round_number'
]

valid_categorical_features = []
for col in categorical_features:
    if col in X.columns:
         if X[col].isnull().any():
            mode_val = X[col].mode()[0] if not X[col].mode().empty else 'Missing'
            X[col].fillna(mode_val, inplace=True)
         if X[col].dtype == 'object':
             X[col] = X[col].astype(str)
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


# ========================================================
# --- 5. Load Model if it exists, else Train (Using Specific Tuned Params) ---
# ========================================================

if os.path.exists(model_filename):
    print(f"\nModel file '{model_filename}' found. Loading model...")
    lgbm = joblib.load(model_filename)
    print("Model loaded successfully.")

else:
    print(f"\nModel file '{model_filename}' not found. Training new model with specified parameters...")

    if (y_train == 1).sum() == 0:
        print("Error: No positive samples (fraud=1) found.")
        scale_pos_weight = 1
    else:
        scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    print(f"Calculated scale_pos_weight: {scale_pos_weight:.2f}")

    best_params_from_previous_run = {
        'learning_rate': 0.034187563479277816, 'num_leaves': 105, 'max_depth': 8,
        'colsample_bytree': 0.6096284833739973, 'subsample': 0.9230844432408162,
        'reg_alpha': 0.007872406388517123, 'reg_lambda': 2.777815343615406
    }

    lgbm = lgb.LGBMClassifier(
        objective='binary', metric='auc', scale_pos_weight=scale_pos_weight,
        n_estimators=2000, n_jobs=-1, random_state=42,
        **best_params_from_previous_run
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
            callbacks=[lgb.early_stopping(100, verbose=True)],
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

threshold = 0.90
new_y_pred_binary = (y_pred_proba > threshold).astype(int)

if len(np.unique(y_val)) > 1:
    auc_score = roc_auc_score(y_val, y_pred_proba)
    pr_auc_score = average_precision_score(y_val, y_pred_proba)

    print("-" * 30)
    print(f"Validation AUC-ROC: {auc_score:.4f}")
    print(f"Validation Average Precision (PR-AUC): {pr_auc_score:.4f}")
    print("-" * 30)
    print(f"\nClassification Report (at {threshold} threshold):")
    print(classification_report(y_val, new_y_pred_binary, target_names=['Not Fraud (0)', 'Fraud (1)']))
else:
    print("Warning: Only one class present in y_val. Cannot calculate metrics.")

print("\nTop 20 Feature Importances:")
try:
    feature_names = X_train.columns
    if hasattr(lgbm, 'feature_importances_') and len(lgbm.feature_importances_) == len(feature_names):
        feat_imp = pd.Series(lgbm.feature_importances_, index=feature_names).sort_values(ascending=False)
        print(feat_imp.head(20))
    else:
        print("Could not retrieve or align feature importances.")
except Exception as e:
    print(f"Error getting feature importances: {e}")