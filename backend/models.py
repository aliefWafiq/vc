from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    clothes = relationship("Cloth", back_populates="owner")

class Cloth(Base):
    __tablename__ = "clothes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    type = Column(String)
    
    # Input values for calculation
    price = Column(Float, default=0.0)
    times_worn = Column(Integer, default=0) # Changed default to 0 for tracking
    material = Column(String, default="Cotton") # Helps determine carbon footprint
    color = Column(String, default="Black")
    image_url = Column(String, default="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop")
    
    # New columns for AI OOTD Scanner
    embedding = Column(Vector(768)) # For Gemini embeddings
    last_worn = Column(DateTime(timezone=True))
    description = Column(Text)
    
    # Store AI-detected values or calculated values
    carbon_efficiency = Column(Float, default=0.0)
    impact_score = Column(Float, default=0.0)
    
    owner = relationship("User", back_populates="clothes")

    @property
    def cost_per_wear(self):
        if self.times_worn > 0:
            return round(self.price / self.times_worn, 2)
        return self.price

    def calculate_metrics(self):
        # Fallback calculation logic if values aren't provided by AI
        base_carbon = {
            "T-Shirt": 5,
            "Jeans": 15,
            "Jacket": 20,
            "Dress": 12
        }
        material_modifier = {
            "Cotton": 1.0,
            "Polyester": 1.5,
            "Linen": 0.7,
            "Recycled": 0.5
        }
        
        carbon = base_carbon.get(self.type, 10) * material_modifier.get(self.material, 1.0)
        efficiency = 100 - (carbon * 2)
        self.carbon_efficiency = max(0, min(100, round(efficiency, 1)))
        
        usage_score = min(100, (self.times_worn / 50) * 100)
        self.impact_score = round((usage_score + self.carbon_efficiency) / 2, 1)
