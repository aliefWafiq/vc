from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class ClothBase(BaseModel):
    name: str
    type: str
    price: float = 0.0
    times_worn: int = 0
    material: str = "Cotton"
    color: str = "Black"
    image_url: str = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop"
    carbon_efficiency: float = 0.0
    impact_score: float = 0.0
    description: Optional[str] = None

class ClothCreate(ClothBase):
    pass

class Cloth(ClothBase):
    id: int
    user_id: int
    cost_per_wear: float
    last_worn: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class OOTDScanResult(BaseModel):
    success: bool
    message: str
    matched_item: Optional[Cloth] = None
    sensory_analysis: Optional[str] = None
    carbon_points: int = 0

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
