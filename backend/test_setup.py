import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:8000"

def setup_test_data():
    # 1. Register a user
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    }
    
    print("Registering user...")
    resp = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
    if resp.status_code == 200:
        print("User registered.")
    else:
        print(f"User registration failed or already exists: {resp.text}")

    # 2. Login
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/api/auth/login", data={"username": "testuser", "password": "password123"})
    if resp.status_code != 200:
        print("Login failed")
        return
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Add a clothing item
    cloth_data = {
        "name": "Blue Denim Jeans",
        "type": "Jeans",
        "price": 50.0,
        "times_worn": 0,
        "material": "Denim",
        "color": "Blue",
        "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d",
        "description": "Blue classic denim jeans durable material"
    }
    
    print("Adding clothing item...")
    resp = requests.post(f"{BASE_URL}/api/clothes", json=cloth_data, headers=headers)
    if resp.status_code == 200:
        print("Clothing item added.")
        item = resp.json()
        print(f"Item ID: {item['id']}, Times Worn: {item['times_worn']}")
    else:
        print(f"Failed to add clothing: {resp.text}")

if __name__ == "__main__":
    setup_test_data()
