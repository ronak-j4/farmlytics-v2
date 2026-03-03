import numpy as np
import pandas as pd
from tensorflow.keras.callbacks import EarlyStopping
import joblib
from sklearn.preprocessing import MinMaxScaler
import os
import sys

# Add parent directory to path to allow running as script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from irrigation_lstm_backend.config import MODEL_PATH, SCALER_PATH, SEQ_LENGTH, PREDICT_DAYS
from irrigation_lstm_backend.lstm_model import build_lstm_model

def generate_synthetic_data(num_samples=2000):
    """
    Generate synthetic daily weather data to train the LSTM.
    Features: temperature, humidity, rainfall, soil_moisture.
    """
    np.random.seed(42)
    temps = np.random.normal(25, 5, num_samples)
    humidity = np.random.normal(60, 15, num_samples)
    rainfall = np.random.exponential(2, num_samples)
    
    # Simulate soil moisture
    soil_moisture = rainfall - temps * 0.1
    
    df = pd.DataFrame({
        'temperature': temps,
        'humidity': humidity,
        'rainfall': rainfall,
        'soil_moisture': soil_moisture
    })
    return df

def create_sequences(data, seq_length, predict_days):
    """
    Create sliding window sequences for LSTM training.
    No random shuffling (time series safe) to prevent data leakage.
    """
    X, y = [], []
    for i in range(len(data) - seq_length - predict_days + 1):
        X.append(data[i:(i + seq_length)])
        
        # Target is the irrigation score for the next 'predict_days'
        # Lower soil moisture -> higher irrigation need
        future_sm = data[(i + seq_length):(i + seq_length + predict_days), 3] # soil_moisture index is 3
        
        # Normalize target to 0-1 for sigmoid/mse
        score = 1.0 - ((future_sm - future_sm.min()) / (future_sm.max() - future_sm.min() + 1e-5))
        score = np.clip(score, 0, 1)
        y.append(score)
        
    return np.array(X), np.array(y)

def train():
    print("Generating synthetic weather data...")
    df = generate_synthetic_data(2000)
    
    print("Scaling data...")
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(df)
    
    print("Creating sequences...")
    X, y = create_sequences(scaled_data, SEQ_LENGTH, PREDICT_DAYS)
    
    # Split train/test (no random shuffling to prevent data leakage)
    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    
    print("Building LSTM model...")
    model = build_lstm_model(SEQ_LENGTH, X.shape[2], PREDICT_DAYS)
    
    early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    
    print("Training LSTM model...")
    model.fit(
        X_train, y_train, 
        epochs=50, 
        batch_size=32, 
        validation_data=(X_test, y_test), 
        callbacks=[early_stop]
    )
    
    print("Saving model and scaler...")
    model.save(MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"Model saved to {MODEL_PATH}")
    print(f"Scaler saved to {SCALER_PATH}")

if __name__ == "__main__":
    train()
