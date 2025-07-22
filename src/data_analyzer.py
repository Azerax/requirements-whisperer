#!/usr/bin/env python3
"""
Data analysis utility for processing user metrics and generating reports.
This module provides functionality for data manipulation and visualization.
"""

import os
import sys
import json
from datetime import datetime
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
import requests
from fastapi import FastAPI
import tensorflow as tf

class DataAnalyzer:
    """Analyzes user data and generates insights."""
    
    def __init__(self, data_source: str):
        """Initialize the analyzer with a data source."""
        self.data_source = data_source
        self.processed_data = None
        
    def load_data(self):
        """Load data from various sources."""
        if self.data_source.endswith('.csv'):
            self.processed_data = pd.read_csv(self.data_source)
        elif self.data_source.endswith('.json'):
            with open(self.data_source, 'r') as f:
                raw_data = json.load(f)
                self.processed_data = pd.DataFrame(raw_data)
        
    def clean_data(self):
        """Clean and preprocess the data."""
        if self.processed_data is not None:
            # Remove nulls using pandas
            self.processed_data = self.processed_data.dropna()
            
            # Normalize numeric columns using numpy
            numeric_cols = self.processed_data.select_dtypes(include=[np.number]).columns
            self.processed_data[numeric_cols] = (
                self.processed_data[numeric_cols] - self.processed_data[numeric_cols].mean()
            ) / self.processed_data[numeric_cols].std()
    
    def generate_visualizations(self):
        """Create visualizations using matplotlib and seaborn."""
        if self.processed_data is not None:
            plt.figure(figsize=(12, 8))
            sns.heatmap(self.processed_data.corr(), annot=True, cmap='coolwarm')
            plt.title('Data Correlation Matrix')
            plt.tight_layout()
            plt.savefig('correlation_matrix.png')
            plt.close()
    
    def build_ml_model(self):
        """Build a machine learning model using scikit-learn and tensorflow."""
        if self.processed_data is not None and len(self.processed_data.columns) > 1:
            # Prepare features and target
            X = self.processed_data.iloc[:, :-1]
            y = self.processed_data.iloc[:, -1]
            
            # Split data using sklearn
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Create a simple neural network with tensorflow
            model = tf.keras.Sequential([
                tf.keras.layers.Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(1, activation='sigmoid')
            ])
            
            model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
            return model
    
    def fetch_external_data(self, api_url: str):
        """Fetch additional data from external APIs using requests."""
        try:
            response = requests.get(api_url, timeout=30)
            if response.status_code == 200:
                return response.json()
        except requests.RequestException as e:
            print(f"Error fetching data: {e}")
        return None

def create_api_server():
    """Create a FastAPI server for data processing endpoints."""
    app = FastAPI(title="Data Analysis API", version="1.0.0")
    
    @app.get("/health")
    def health_check():
        return {"status": "healthy", "timestamp": datetime.now().isoformat()}
    
    @app.post("/analyze")
    def analyze_data(data_path: str):
        analyzer = DataAnalyzer(data_path)
        analyzer.load_data()
        analyzer.clean_data()
        analyzer.generate_visualizations()
        return {"message": "Analysis completed successfully"}
    
    return app

if __name__ == "__main__":
    # Example usage
    analyzer = DataAnalyzer("sample_data.csv")
    analyzer.load_data()
    analyzer.clean_data()
    analyzer.generate_visualizations()
    model = analyzer.build_ml_model()
    
    # Fetch some external data
    external_data = analyzer.fetch_external_data("https://api.github.com/users/octocat")
    
    print("Data analysis completed successfully!")