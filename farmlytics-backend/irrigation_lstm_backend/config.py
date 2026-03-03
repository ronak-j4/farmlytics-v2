import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'irrigation_lstm_model.h5')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')

SEQ_LENGTH = 7
PREDICT_DAYS = 5
