from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout

def build_lstm_model(seq_length: int, num_features: int, predict_days: int):
    """
    Build the LSTM model architecture.
    2 LSTM layers, Dropout, Dense output (5 units).
    """
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(seq_length, num_features)),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(predict_days, activation='sigmoid') # 5 units for next 5 days
    ])
    
    model.compile(optimizer='adam', loss='mse')
    return model
