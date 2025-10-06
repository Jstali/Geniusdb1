"""
Data manager module to handle the df_final DataFrame
This module loads and manages the processed data for the API
"""

import pandas as pd
import os

# Global variable to hold the processed data
df_final = None

def load_data():
    """Load the processed data from CSV file"""
    global df_final
    DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    csv_path = os.path.join(DATA_DIR, "transformed_transformer_data.csv")
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Data file not found at {csv_path}")
    
    df_final = pd.read_csv(csv_path)
    print(f"Loaded {len(df_final)} records from {csv_path}")
    return df_final

def get_data():
    """Get the processed data DataFrame"""
    global df_final
    if df_final is None:
        df_final = load_data()
    return df_final

# Load data when module is imported
try:
    load_data()
except Exception as e:
    print(f"Error loading data: {e}")
    df_final = pd.DataFrame()  # Empty DataFrame as fallback