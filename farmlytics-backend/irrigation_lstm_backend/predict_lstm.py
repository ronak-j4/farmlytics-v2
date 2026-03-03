import numpy as np
import os
import sys

# Add parent directory to path to allow running as script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tensorflow.keras.models import load_model
from irrigation_lstm_backend.config import MODEL_PATH
from irrigation_lstm_backend.data_preprocessing import preprocess_weather_data
from irrigation_lstm_backend.weather_service import get_past_7_days_weather
from irrigation_lstm_backend.irrigation_logic import convert_to_labels

def predict_irrigation(latitude: float, longitude: float):
    """
    Predict irrigation requirement for next 5 days.
    1. Fetch real-time weather using Open-Meteo API
    2. Preprocess data
    3. Use LSTM model
    4. Convert predictions into Low / Medium / High
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Please run train_lstm.py first.")
        
    # 1. Fetch weather
    df = get_past_7_days_weather(latitude, longitude)
    
    # 2. Preprocess
    X = preprocess_weather_data(df)
    
    # 3. Predict
    model = load_model(MODEL_PATH)
    predictions = model.predict(X)[0] # Array of 5 values
    
    # 4. Convert to labels
    result = convert_to_labels(predictions)
    return result

if __name__ == "__main__":
    # Test prediction
    print("Testing irrigation prediction for New Delhi (28.6139, 77.2090)...")
    try:
        res = predict_irrigation(28.6139, 77.2090)
        print("Prediction result:")
        print(res)
    except Exception as e:
        print(f"Error during prediction: {e}")
