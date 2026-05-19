import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db, Base, engine
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# For testing, we could use a local sqlite db to avoid messing with production/dev supabase
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    if os.path.exists("./test.db"):
        os.remove("./test.db")

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "VibeCloset API sedang berjalan dengan sistem Auth aktif"}

def test_register_user():
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "email": "test@example.com", "password": "testpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_register_duplicate_username():
    client.post(
        "/api/auth/register",
        json={"username": "testuser2", "email": "test2@example.com", "password": "testpassword"}
    )
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser2", "email": "other@example.com", "password": "testpassword"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already registered"

def test_login_user():
    # Register first
    client.post(
        "/api/auth/register",
        json={"username": "loginuser", "email": "login@example.com", "password": "password123"}
    )
    
    # Login
    response = client.post(
        "/api/auth/login",
        data={"username": "loginuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password():
    response = client.post(
        "/api/auth/login",
        data={"username": "loginuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_add_and_get_clothes():
    # Login to get token
    login_res = client.post(
        "/api/auth/login",
        data={"username": "loginuser", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Add cloth
    cloth_data = {
        "name": "Cool Shirt",
        "type": "T-Shirt",
        "price": 25.0,
        "times_worn": 5,
        "material": "Cotton",
        "color": "Blue"
    }
    response = client.post("/api/clothes", json=cloth_data, headers=headers)
    assert response.status_code == 200
    cloth_id = response.json()["id"]
    
    # Get clothes list
    response = client.get("/api/clothes", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1
    
    # Get specific cloth
    response = client.get(f"/api/clothes/{cloth_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Cool Shirt"
    assert response.json()["cost_per_wear"] == 5.0 # 25 / 5
