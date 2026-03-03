import requests
import pandas as pd
from datetime import datetime, timedelta

def get_past_7_days_weather(latitude: float, longitude: float):
    """
    Fetch past 7 days historical weather using Open-Meteo API.
    No API key required.
    """
    # Open-Meteo forecast API supports past_days=7
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&past_days=7&forecast_days=1&hourly=temperature_2m,relative_humidity_2m,precipitation&timezone=auto"
    
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch weather data from Open-Meteo: {response.text}")
        
    data = response.json()
    
    df = pd.DataFrame({
        'time': pd.to_datetime(data['hourly']['time']),
        'temperature': data['hourly']['temperature_2m'],
        'humidity': data['hourly']['relative_humidity_2m'],
        'rainfall': data['hourly']['precipitation']
    })
    
    # Group by day
    df['date'] = df['time'].dt.date
    daily_df = df.groupby('date').agg({
        'temperature': 'mean',
        'humidity': 'mean',
        'rainfall': 'sum'
    }).reset_index()
    
    # Get exactly the last 7 days
    daily_df = daily_df.head(7)
    
    # Simulate soil moisture
    daily_df['soil_moisture'] = daily_df['rainfall'] - daily_df['temperature'] * 0.1
    
    return daily_df[['temperature', 'humidity', 'rainfall', 'soil_moisture']]
