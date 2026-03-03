import joblib
import pandas as pd
import numpy as np
from .config import SCALER_PATH

def preprocess_weather_data(df: pd.DataFrame):
    """
    Preprocess the past 7 days weather data for LSTM prediction.
    Uses MinMaxScaler to scale the data.
    """
    scaler = joblib.load(SCALER_PATH)
    scaled_data = scaler.transform(df)
    
    # Reshape for LSTM: (batch_size, seq_length, num_features)
    # Here batch_size is 1, seq_length is 7, num_features is 4
    return scaled_data.reshape(1, 7, 4)
