# --- IMPORTS ---
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from xgboost import XGBClassifier
from sklearn.metrics import recall_score, precision_score, classification_report
import os
from io import StringIO
from geopy.distance import great_circle 
import warnings
import joblib 
from datetime import datetime 

# --- Configurare Avertismente ---
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

# --- 1. Funcție de Încărcare și Preprocesare Inițială ---

def load_and_preprocess(file_path, separator='|'):
    """
    Încarcă datele din fișierul specificat și aplică preprocesarea de bază.
    """
    print("1. Încărcare Date...")
    try:
        df = pd.read_csv(file_path, sep=separator, low_memory=False)
    except FileNotFoundError:
        print(f"Eroare: Fișierul nu a fost găsit: {file_path}. Script oprit.")
        raise SystemExit 
        
    df = df.dropna(subset=['is_fraud']) # Eliminăm doar rândurile unde ținta lipsește

    # Păstrăm SSN pentru feature-uri noi
    columns_to_drop = ['transaction_id', 'first', 'last', 'street', 'job', 'dob', 
                       'profile', 'trans_num', 'trans_date', 'trans_time', 'zip']
    df = df.drop(columns=columns_to_drop, errors='ignore')

    df['trans_datetime'] = pd.to_datetime(df['unix_time'], unit='s')
    df['hour'] = df['trans_datetime'].dt.hour
    df['day_of_week'] = df['trans_datetime'].dt.dayofweek

    print("Date încărcate și preprocesare de bază finalizată.")
    return df

# --- 2. Funcții de Feature Engineering Hibrid ---

def _calculate_distance(row):
    """Funcție helper pentru calculul distanței geografice."""
    card_loc = (row['lat'], row['long'])
    merch_loc = (row['merch_lat'], row['merch_long'])
    try:
        # Verificăm dacă valorile sunt valide înainte de calcul
        if pd.notna(card_loc).all() and pd.notna(merch_loc).all():
             # Asigurăm că latitudinile și longitudinile sunt în limite valide
            if -90 <= card_loc[0] <= 90 and -180 <= card_loc[1] <= 180 and \
               -90 <= merch_loc[0] <= 90 and -180 <= merch_loc[1] <= 180:
                return great_circle(card_loc, merch_loc).km
        return np.nan # Returnăm NaN dacă datele sunt invalide
    except Exception:
        return np.nan 

def feature_engineer(df):
    """
    Aplică toate etapele de feature engineering hibrid pe DataFrame.
    """
    print("2. Începe Feature Engineering Hibrid...")

    # A. Distanța Geografică (DIST_KM_TRX)
    df['DIST_KM_TRX'] = df.apply(_calculate_distance, axis=1)

    # B. Abaterea Sumei (Card Level)
    df['cc_num'] = df['cc_num'].astype(str)
    cc_avg_amt = df.groupby('cc_num')['amt'].mean().reset_index().rename(columns={'amt': 'CC_AVG_AMT'})
    df = df.merge(cc_avg_amt, on='cc_num', how='left')
    df['ABATERE_SUMA_FACTOR'] = (df['amt'] / df['CC_AVG_AMT']).replace([np.inf, -np.inf], 999)

    # C. Velocity Features Granulare (Card Level)
    df = df.sort_values('trans_datetime').reset_index(drop=True)
    grouped_card = df.groupby('cc_num')

    for window in ['900s', '3600s', '86400s']: # 15min, 1h, 24h
        window_name = window.replace('s', '')
        rolling_counts = grouped_card.rolling(window=window, on='trans_datetime', closed='left')['unix_time'].count()
        df[f'VITEZA_{window_name}_CARD'] = rolling_counts.reset_index(level=0, drop=True).values

    # D. Time Delta (Card Level)
    df['TIMP_DE_LA_ULTIMA_TRX_SEC_CARD'] = grouped_card['unix_time'].diff()

    # E. Agregări pe Entități (Graph-like)
    card_count_per_acct = df.groupby('acct_num')['cc_num'].nunique().reset_index().rename(columns={'cc_num': 'NR_CARDURI_PE_CONT'})
    df = df.merge(card_count_per_acct, on='acct_num', how='left')
    card_count_per_merch = df.groupby('merchant')['cc_num'].nunique().reset_index().rename(columns={'cc_num': 'NR_CARDURI_PE_MERCHANT'})
    df = df.merge(card_count_per_merch, on='merchant', how='left')

    # F. Heuristica Nume Merchant
    df['is_merchant_name_suspicious'] = df['merchant'].str.contains('fraud_', case=False, na=False).astype(int)

    # G. Feature-uri Centrate pe Utilizator (SSN)
    print("   Calcul Feature-uri SSN...")
    df['ssn'] = df['ssn'].astype(str)
    df = df.sort_values(by=['ssn', 'unix_time']).reset_index(drop=True) # Sortare crucială
    grouped_user = df.groupby('ssn')

    df['time_since_last_user_trans'] = grouped_user['unix_time'].diff()
    df['user_trans_count'] = grouped_user.cumcount()
    
    user_amt_shifted = grouped_user['amt'].shift(1)
    df['user_avg_amt_so_far'] = user_amt_shifted.groupby(df['ssn']).expanding().mean().reset_index(level=0, drop=True)
    df['user_max_amt_so_far'] = user_amt_shifted.groupby(df['ssn']).expanding().max().reset_index(level=0, drop=True)

    df['amt_vs_user_avg_ratio'] = (df['amt'] / df['user_avg_amt_so_far']).replace([np.inf, -np.inf], 999)
    df['is_over_user_max_amt'] = (df['amt'] > df['user_max_amt_so_far']).astype(int)

    # Curățare NaN-uri & Infinit
    fill_values = {
        'CC_AVG_AMT': df['amt'].mean(),
        'ABATERE_SUMA_FACTOR': 1,
        'VITEZA_900_CARD': 0, 'VITEZA_3600_CARD': 0, 'VITEZA_86400_CARD': 0,
        'TIMP_DE_LA_ULTIMA_TRX_SEC_CARD': 86400*30,
        'NR_CARDURI_PE_CONT': 1, 'NR_CARDURI_PE_MERCHANT': 1,
        'time_since_last_user_trans': 86400*30,
        'user_avg_amt_so_far': df['amt'].mean(),
        'user_max_amt_so_far': df['amt'].max(),
        'amt_vs_user_avg_ratio': 1,
        'DIST_KM_TRX': df['DIST_KM_TRX'].median()
    }
    df.fillna(fill_values, inplace=True)
    print("Feature Engineering Hibrid finalizat.")
    return df

# --- 4. Funcție de Target Encoding ---

def encode_features(X_train, X_test, y_train, high_card_features_to_encode, low_card_features_to_dummy):
    """
    Aplică Target Encoding și One-Hot Encoding pe seturile de train și test.
    Previne data leakage prin calcularea mediei doar pe y_train.
    """
    print("4. Începe Target Encoding...")
    
    # Creăm copii pentru a evita avertismentele SettingWithCopyWarning
    X_train_enc = X_train.copy()
    X_test_enc = X_test.copy()

    global_fraud_mean = y_train.mean()
    train_df_for_encoding = X_train.copy()
    train_df_for_encoding['is_fraud'] = y_train

    # Target Encode
    for col in high_card_features_to_encode:
        encoding_map = train_df_for_encoding.groupby(col)['is_fraud'].mean()
        new_col_name = f"{col}_encoded"
        X_train_enc[new_col_name] = X_train_enc[col].map(encoding_map)
        X_test_enc[new_col_name] = X_test_enc[col].map(encoding_map)
        X_train_enc[new_col_name] = X_train_enc[new_col_name].fillna(global_fraud_mean)
        X_test_enc[new_col_name] = X_test_enc[new_col_name].fillna(global_fraud_mean)

    # One-Hot Encode
    X_train_enc = pd.get_dummies(X_train_enc, columns=low_card_features_to_dummy, drop_first=True)
    X_test_enc = pd.get_dummies(X_test_enc, columns=low_card_features_to_dummy, drop_first=True)

    # Drop coloanele originale
    X_train_enc = X_train_enc.drop(columns=high_card_features_to_encode)
    X_test_enc = X_test_enc.drop(columns=high_card_features_to_encode)

    # Aliniem coloanele
    X_train_enc, X_test_enc = X_train_enc.align(X_test_enc, join='inner', axis=1, fill_value=0)
    print("Target Encoding finalizat.")
    return X_train_enc, X_test_enc

# --- 5. Funcție de Antrenare a Modelului ---

def train_model(X_train, y_train, param_grid):
    """
    Antrenează modelul XGBClassifier folosind GridSearchCV.
    """
    print("5. Începe Antrenarea Modelului cu GridSearchCV...")
    scale_pos_weight = np.sum(y_train == 0) / np.sum(y_train == 1)
    print(f"   Pondere calculată: {scale_pos_weight:.2f}")

    xgb_model = XGBClassifier(
        objective='binary:logistic',
        scale_pos_weight=scale_pos_weight, 
        use_label_encoder=False,
        eval_metric='aucpr',
        random_state=42,
        n_jobs=-1
    )

    grid_search = GridSearchCV(
        estimator=xgb_model, 
        param_grid=param_grid, 
        scoring='average_precision',
        cv=3, 
        verbose=2 
    )

    grid_search.fit(X_train, y_train) 
    xgb_model_final = grid_search.best_estimator_
    print(f"\n   Cei mai buni parametri găsiți: {grid_search.best_params_}")
    print("Antrenare finalizată.")
    return xgb_model_final, grid_search.best_params_

# --- 6-8. Funcție de Evaluare și Salvare ---

def evaluate_and_save(model, X_test, y_test, threshold, input_file_path, best_params):
    """
    Evaluează modelul pe setul de test folosind pragul dat,
    salvează modelul și un raport de evaluare.
    """
    print("6. Evaluare Model Final...")
    y_proba = model.predict_proba(X_test)[:, 1] 

    y_pred_adjusted = (y_proba > threshold).astype(int)

    recall_adj = recall_score(y_test, y_pred_adjusted, zero_division=0)
    precision_adj = precision_score(y_test, y_pred_adjusted, zero_division=0)

    report_string = classification_report(y_test, y_pred_adjusted, target_names=['Non-Fraudă (0)', 'Fraudă (1)'])

    print("\n--- REZULTATE FINALE MODEL HIBRID ---")
    print(f"Prag de Decizie Folosit: {threshold}")
    print(f"Recall (Capturarea Fraudelor): {recall_adj:.4f}")
    print(f"Precision (Evitarea False Positives): {precision_adj:.4f}")
    print("\nRaport de Clasificare Detaliat (Prag Ajustat):")
    print(report_string)

    # --- 7. Salvarea Modelului ---
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_filename = f'fraud_detection_model_hybrid_{timestamp_str}.joblib'
    joblib.dump(model, model_filename)
    print(f"\n--- Modelul a fost salvat: {os.path.abspath(model_filename)} ---")

    # --- 8. Salvarea Raportului ---
    report_filename = f'evaluation_report_hybrid_{timestamp_str}.txt'
    output_content = f"""
--- RAPORT EVALUARE MODEL HIBRID ---
Timestamp: {timestamp_str}
Set Date: {input_file_path}
Total Testate: {len(y_test)}
Rata Fraudă Test: {y_test.mean() * 100:.2f}%
Parametri Optimi: {best_params}

--- REZULTATE LA PRAGUL {threshold} ---
Recall: {recall_adj:.4f}
Precision: {precision_adj:.4f}

--- RAPORT CLASIFICARE ---
{report_string}
"""
    try:
        with open(report_filename, 'w') as f:
            f.write(output_content)
        print(f"--- Raportul a fost salvat: {os.path.abspath(report_filename)} ---")
    except Exception as e:
        print(f"Eroare salvare raport: {e}")

# --- Funcția Principală de Pipeline ---

def run_pipeline(file_path, separator, param_grid, threshold):
    """
    Orchestrează întregul pipeline de la încărcare la evaluare.
    """
    
    # Etapele 1 și 2: Încărcare și Feature Engineering
    df = load_and_preprocess(file_path, separator)
    df = feature_engineer(df)

    # Etapa 3: Definirea Feature-urilor Finale și Împărțirea Datelor
    print("3. Definire Feature-uri Finale și Împărțire Date...")
    target_col = 'is_fraud'

    numerical_features = [
        'lat', 'long', 'city_pop', 'merch_lat', 'merch_long', 'amt', 
        'hour', 'day_of_week', 
        'DIST_KM_TRX', 'ABATERE_SUMA_FACTOR', 
        'VITEZA_900_CARD', 'VITEZA_3600_CARD', 'VITEZA_86400_CARD',
        'TIMP_DE_LA_ULTIMA_TRX_SEC_CARD', 
        'NR_CARDURI_PE_CONT', 'NR_CARDURI_PE_MERCHANT',
        'time_since_last_user_trans', 'user_trans_count', 
        'user_avg_amt_so_far', 'user_max_amt_so_far', 
        'amt_vs_user_avg_ratio'
    ]
    categorical_features_for_encoding = ['gender', 'category', 'state', 'merchant', 'city', 'acct_num', 'ssn']
    binary_features = ['is_merchant_name_suspicious', 'is_over_user_max_amt']

    X = df[numerical_features + categorical_features_for_encoding + binary_features]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.1, random_state=42, stratify=y
    ) 
    print(f"   Împărțire finalizată. Test set size: {len(X_test)}. Test fraud rate: {y_test.mean() * 100:.2f}%") 

    # Listele specifice pentru funcția de encoding
    high_card_features_to_encode = ['merchant', 'city', 'state', 'acct_num', 'ssn']
    low_card_features_to_dummy = ['gender', 'category']
    
    # Etapa 4: Encoding
    X_train_enc, X_test_enc = encode_features(
        X_train, X_test, y_train, 
        high_card_features_to_encode, 
        low_card_features_to_dummy
    )

    # Etapa 5: Antrenare
    model, best_params = train_model(X_train_enc, y_train, param_grid)

    # Etapele 6-8: Evaluare și Salvare
    evaluate_and_save(model, X_test_enc, y_test, threshold, file_path, best_params)


# --- Punct de Intrare ---

if __name__ == "__main__":
    
    # Definim constantele și configurările aici
    FILE_PATH = "/kaggle/input/dataset1/hackathon-labeled-train.csv"
    SEPARATOR = '|'
    PRECISION_PRIORITY_THRESHOLD = 0.90
    
    PARAM_GRID = {
        'n_estimators': [300, 400],         
        'learning_rate': [0.05],          
        'max_depth': [7, 9], 
        'subsample': [0.8], 
        'colsample_bytree': [0.8]
    }
    
    # Rulăm pipeline-ul complet
    run_pipeline(FILE_PATH, SEPARATOR, PARAM_GRID, PRECISION_PRIORITY_THRESHOLD)