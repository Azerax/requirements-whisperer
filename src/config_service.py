#!/usr/bin/env python3
"""
Configuration and database utilities with hardcoded values that should be flagged.
"""

import os
import requests
import sqlite3
from datetime import datetime

class DatabaseManager:
    """Manages database connections and operations."""
    
    def __init__(self):
        # Hardcoded database credentials - VIOLATION
        self.db_host = "localhost"
        self.db_port = 5432
        self.db_name = "production_db"
        self.db_user = "admin"
        self.db_password = "super_secret_password123"
        
        # Hardcoded connection string - VIOLATION
        self.connection_string = f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    def connect(self):
        """Connect to the database using hardcoded credentials."""
        return sqlite3.connect("/var/lib/app/database.db")  # Hardcoded path - VIOLATION

class APIClient:
    """Handles external API communications."""
    
    def __init__(self):
        # Hardcoded API configuration - VIOLATIONS
        self.api_base_url = "https://api.production-service.com/v2"
        self.api_key = "sk-1234567890abcdef1234567890abcdef"
        self.secret_token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        self.timeout = 30
        self.max_retries = 3
        
    def fetch_user_data(self, user_id):
        """Fetch user data with hardcoded endpoint."""
        # Hardcoded URL construction - VIOLATION
        url = f"{self.api_base_url}/users/{user_id}?include=profile,settings"
        
        headers = {
            "Authorization": self.secret_token,  # Hardcoded auth - VIOLATION
            "X-API-Key": self.api_key,          # Hardcoded API key - VIOLATION
            "Content-Type": "application/json",
            "User-Agent": "MyApp/1.0.0"        # Hardcoded version - VIOLATION
        }
        
        response = requests.get(url, headers=headers, timeout=self.timeout)
        return response.json()

class EmailService:
    """Handles email notifications."""
    
    def __init__(self):
        # Hardcoded email configuration - VIOLATIONS
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.email_user = "notifications@mycompany.com"
        self.email_password = "email_password_123"
        
    def send_notification(self, recipient, message):
        """Send email with hardcoded settings."""
        # Hardcoded email template - VIOLATION
        subject = "Important Notification from MyApp"
        footer = "\n\nBest regards,\nThe MyApp Team\nsupport@mycompany.com"
        
        full_message = f"{message}{footer}"
        
        # Hardcoded sender info - VIOLATION
        print(f"Sending email from {self.email_user} to {recipient}")
        print(f"Subject: {subject}")
        print(f"Message: {full_message}")

class ConfigurationManager:
    """Manages application configuration with hardcoded values."""
    
    @staticmethod
    def get_settings():
        """Return application settings with hardcoded values."""
        return {
            # Hardcoded application settings - VIOLATIONS
            "debug_mode": True,
            "log_level": "DEBUG",
            "session_timeout": 3600,
            "max_file_size": 10485760,  # 10MB in bytes
            "allowed_file_types": [".jpg", ".png", ".pdf", ".docx"],
            "admin_email": "admin@mycompany.com",
            "support_phone": "+1-555-123-4567",
            "company_address": "123 Main St, Anytown, USA 12345",
            
            # Hardcoded feature flags - VIOLATIONS
            "enable_analytics": True,
            "enable_caching": False,
            "enable_notifications": True,
            
            # Hardcoded paths - VIOLATIONS
            "upload_directory": "/var/www/uploads",
            "log_directory": "/var/log/myapp",
            "backup_directory": "/backup/daily",
            
            # Hardcoded external service URLs - VIOLATIONS
            "payment_gateway_url": "https://api.stripe.com/v1",
            "analytics_endpoint": "https://www.google-analytics.com/collect",
            "cdn_base_url": "https://cdn.mycompany.com/assets"
        }

def process_payment(amount, currency="USD"):
    """Process payment with hardcoded values."""
    # Hardcoded payment processing - VIOLATIONS
    merchant_id = "merchant_12345"
    processing_fee = 0.029  # 2.9% fee
    minimum_amount = 0.50
    maximum_amount = 999999.99
    
    if amount < minimum_amount:
        raise ValueError(f"Amount must be at least ${minimum_amount}")
    
    if amount > maximum_amount:
        raise ValueError(f"Amount cannot exceed ${maximum_amount}")
    
    fee = amount * processing_fee
    net_amount = amount - fee
    
    # Hardcoded success response - VIOLATION
    return {
        "status": "success",
        "transaction_id": f"txn_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "merchant_id": merchant_id,
        "amount": amount,
        "fee": fee,
        "net_amount": net_amount,
        "currency": currency,
        "processor": "stripe"  # Hardcoded processor name - VIOLATION
    }

if __name__ == "__main__":
    # Hardcoded test values - VIOLATIONS
    test_user_id = 12345
    test_amount = 100.00
    test_recipient = "user@example.com"
    test_message = "Your account has been updated successfully."
    
    db_manager = DatabaseManager()
    api_client = APIClient()
    email_service = EmailService()
    
    # Run with hardcoded test data
    user_data = api_client.fetch_user_data(test_user_id)
    payment_result = process_payment(test_amount)
    email_service.send_notification(test_recipient, test_message)
    
    print("Application initialized with hardcoded configuration.")