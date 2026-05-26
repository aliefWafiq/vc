from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
from typing import List
import json
import asyncio
from datetime import timedelta
import base64

import models, schemas, auth_utils, database
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="VibeCloset API")

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "*").split(",")
allow_credentials = True
if "*" in origins:
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# --- Gemini Configuration ---
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "MASUKKAN_API_KEY_ANDA_DISINI":
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"ERROR: Failed to initialize Gemini client: {e}")

def get_embedding(text: str):
    if not client:
        return None
    try:
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

# --- Dependency ---
async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth_utils.jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except auth_utils.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# --- Auth Endpoints ---

@app.post("/api/auth/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth_utils.get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Clothing Endpoints ---

@app.post("/api/clothes", response_model=schemas.Cloth)
def add_cloth(cloth: schemas.ClothCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Generate description if not provided, for better matching
    desc = cloth.description or f"{cloth.color} {cloth.material} {cloth.type} named {cloth.name}"
    embedding = get_embedding(desc)
    db_cloth = models.Cloth(
        **cloth.model_dump(), 
        user_id=current_user.id,
        embedding=embedding
    )
    db.add(db_cloth)
    db.commit()
    db.refresh(db_cloth)
    return db_cloth

@app.get("/api/clothes", response_model=List[schemas.Cloth])
def get_user_clothes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return current_user.clothes

@app.get("/api/clothes/{cloth_id}", response_model=schemas.Cloth)
def get_cloth(cloth_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cloth = db.query(models.Cloth).filter(models.Cloth.id == cloth_id, models.Cloth.user_id == current_user.id).first()
    if not cloth:
        raise HTTPException(status_code=404, detail="Cloth not found")
    return cloth

@app.delete("/api/clothes/{cloth_id}")
def delete_cloth(cloth_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cloth = db.query(models.Cloth).filter(models.Cloth.id == cloth_id, models.Cloth.user_id == current_user.id).first()
    if not cloth:
        raise HTTPException(status_code=404, detail="Cloth not found")
    
    db.delete(cloth)
    db.commit()
    return {"message": "Cloth deleted successfully"}

@app.get("/api/eco-analytics")
def get_eco_analytics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    clothes = current_user.clothes
    if not clothes:
        return {
            "cost_per_wear": 0,
            "carbon_savings_kg": 0,
            "impact_score": 0
        }
    
    total_cost_per_wear = sum(c.cost_per_wear for c in clothes)
    avg_cost_per_wear = round(total_cost_per_wear / len(clothes), 2)
    
    total_carbon_efficiency = sum(c.carbon_efficiency for c in clothes)
    avg_carbon_efficiency = round(total_carbon_efficiency / len(clothes), 1)
    
    # Calculate impact score based on usage and carbon
    total_impact = sum(c.impact_score for c in clothes)
    avg_impact = round(total_impact / len(clothes), 1)
    
    return {
        "cost_per_wear": avg_cost_per_wear,
        "carbon_savings_kg": avg_carbon_efficiency, # Using efficiency as a proxy for savings in this mock
        "impact_score": avg_impact
    }

@app.post("/api/identify")
async def identify_clothing(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    if not client:
        raise HTTPException(status_code=503, detail="Gemini API not configured")
    
    try:
        image_bytes = await file.read()
        
        prompt = """
        Analyze this image of a clothing item. 
        Identify the following:
        1. type (e.g., T-Shirt, Jeans, Jacket, Dress, etc.)
        2. name (a short descriptive name, e.g., "Vintage Denim Jacket")
        3. material (likely material, e.g., "Cotton", "Denim", "Polyester")
        4. color (primary color)
        5. carbon_efficiency (a numeric score between 1 and 10 representing environmental friendliness)
        6. impact_score (a numeric score between 1 and 100 representing overall sustainability)

        Return ONLY a JSON object with these keys: type, name, material, color, carbon_efficiency, impact_score.
        """
        
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=file.content_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        return json.loads(response.text)
    except Exception as e:
        print(f"Identification error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to identify clothing: {str(e)}")

@app.post("/api/ootd/scan", response_model=schemas.OOTDScanResult)
async def scan_ootd(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not client:
        raise HTTPException(status_code=503, detail="Gemini API not configured")
    
    try:
        image_bytes = await file.read()
        
        # 1. Identify and analyze with Gemini
        prompt = """
        Analyze this OOTD (Outfit of the Day) photo.
        1. Describe the main clothing item visible (type, color, material).
        2. Identify the material texture and any potential irritants (e.g., "rough wool", "synthetic tags", "stiff denim") for users with sensory sensitivities (Autism-friendly analysis).
        3. Provide a short description for vector matching.
        
        Return ONLY a JSON object with these keys: 
        - description (string for vector matching)
        - sensory_analysis (string describing comfort/sensitivities)
        - item_type (string)
        """
        
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=file.content_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        try:
            analysis = json.loads(response.text)
        except json.JSONDecodeError:
            # Fallback if Gemini doesn't return clean JSON despite the mime_type
            import re
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                raise Exception(f"Invalid JSON response from Gemini: {response.text}")

        desc = analysis.get("description", "")
        sensory = analysis.get("sensory_analysis", "")
        
        # 2. Get embedding for the detected description
        query_embedding = get_embedding(desc)
        
        if not query_embedding:
            return schemas.OOTDScanResult(
                success=False,
                message="Could not generate embedding for identification.",
                sensory_analysis=sensory
            )
        
        # 3. Vector similarity search (top 1)
        # Using l2_distance or cosine_distance
        matched_item = db.query(models.Cloth)\
            .filter(models.Cloth.user_id == current_user.id)\
            .order_by(models.Cloth.embedding.l2_distance(query_embedding))\
            .first()
        
        # Check if it's a reasonably close match (distance threshold)
        # In a real app, we'd tune this. For now, we take the best match if it exists.
        if matched_item:
            # 4. Update item stats
            matched_item.times_worn += 1
            matched_item.last_worn = func.now()
            # Recalculate metrics (including carbon efficiency bonus)
            matched_item.calculate_metrics()
            
            db.commit()
            db.refresh(matched_item)
            
            return schemas.OOTDScanResult(
                success=True,
                message=f"Matched with your {matched_item.name}! Rewearing items saves carbon.",
                matched_item=matched_item,
                sensory_analysis=sensory,
                carbon_points=10 # Bonus points for rewearing
            )
        else:
            return schemas.OOTDScanResult(
                success=False,
                message="No matching item found in your wardrobe.",
                sensory_analysis=sensory
            )
            
    except Exception as e:
        print(f"OOTD Scan error: {e}")
        raise HTTPException(status_code=500, detail=f"OOTD Scan failed: {str(e)}")

# Gemini logic used above via client

SYSTEM_PROMPT = """
Anda adalah "VibeCloset AI Fashion Stylist", asisten gaya cerdas yang sangat berpengetahuan luas tentang fashion, tren terkini, teori warna, tekstil, dan fashion berkelanjutan.

ATURAN KETAT:
1. Anda HANYA diperbolehkan menjawab pertanyaan yang berkaitan dengan FASHION, GAYA BERPAKAIAN, TEKSTIL, dan PERAWATAN PAKAIAN.
2. Jika pengguna menanyakan hal lain di luar fashion (misalnya: matematika, sejarah, sains, pemrograman, resep masak, tips kesehatan non-fashion, dll.), Anda HARUS menolak dengan sopan dan mengarahkan kembali ke topik fashion.
3. Contoh penolakan: "Mohon maaf, saya adalah spesialis fashion VibeCloset. Saya tidak dapat menjawab pertanyaan tersebut. Namun, saya akan sangat senang membantu Anda memadukan pakaian atau memberikan tips gaya!"
4. Gunakan Bahasa Indonesia yang santun, inspiratif, dan profesional.
5. Fokus pada memberikan solusi gaya yang estetik dan berkelanjutan.
6. JANGAN gunakan simbol markdown seperti asterisk (*), double asterisk (**), pagar (#), atau backticks (`) untuk pemformatan teks (seperti tebal, miring, atau judul). Gunakan teks biasa yang bersih dan mudah dibaca tanpa simbol dekoratif.
7. Jika Anda memberikan rekomendasi outfit yang spesifik, sertakan blok data di akhir pesan Anda yang dibungkus dengan tag [RECOMMENDATION]...[/RECOMMENDATION] agar sistem dapat menampilkannya dalam format kartu yang cantik.
Format data di dalam tag harus berupa JSON valid seperti ini:
[RECOMMENDATION]
{
  "title": "Casual Chic Weekend",
  "items": [
    {"name": "Atasan", "desc": "Oversized white linen shirt"},
    {"name": "Bawahan", "desc": "Light wash high-waisted denim jeans"},
    {"name": "Sepatu", "desc": "White leather sneakers"},
    {"name": "Aksesoris", "desc": "Minimalist gold hoop earrings & tote bag"}
  ],
  "reason": "Kombinasi ini memberikan kesan santai namun tetap terlihat rapi dan chic untuk kegiatan akhir pekan."
}
[/RECOMMENDATION]
"""

@app.websocket("/ws/stylist")
async def websocket_endpoint(websocket: WebSocket, token: str = None, db: Session = Depends(get_db)):
    await websocket.accept()
    
    # Authenticate WebSocket
    if not token:
        await websocket.send_text("Error: Authentication token missing")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = auth_utils.jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise Exception("Invalid token")
        user = db.query(models.User).filter(models.User.username == username).first()
        if user is None:
            raise Exception("User not found")
    except Exception as e:
        await websocket.send_text(f"Error: Authentication failed ({str(e)})")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    chat = None
    if client:
        try:
            chat = client.chats.create(
                model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.7,
                )
            )
        except Exception as e:
            print(f"Error creating chat session: {e}")
            chat = None

    try:
        welcome_msg = "Halo! Saya VibeStylist Anda. Saya siap membantu Anda mengkurasi gaya yang sempurna dan berkelanjutan. Apa yang ingin Anda diskusikan hari ini mengenai outfit atau lemari pakaian Anda?"
        await websocket.send_text(welcome_msg)
        
        while True:
            data = await websocket.receive_text()
            
            if not client:
                await websocket.send_text("Maaf, layanan AI sedang tidak tersedia (API Key belum dikonfigurasi).")
                continue

            if data.startswith("data:image"):
                try:
                    # Extract base64 data
                    header, encoded = data.split(",", 1)
                    image_bytes = base64.b64decode(encoded)
                    
                    if chat:
                        # Send image to Gemini
                        response = chat.send_message(
                            message=[
                                types.Part.from_bytes(
                                    data=image_bytes,
                                    mime_type="image/jpeg"
                                ),
                                "Berikan analisis mendalam tentang pakaian yang saya kenakan dan bentuk tubuh saya. Berikan saran gaya yang spesifik dan estetik berdasarkan input visual ini."
                            ]
                        )
                        response_text = response.text
                    else:
                        response_text = "Maaf, sesi analisis visual tidak dapat dimulai."
                except Exception as e:
                    print(f"Image processing error: {e}")
                    response_text = "Maaf, terjadi kesalahan teknis saat menganalisis gambar Anda."
            else:
                try:
                    if chat:
                        response = chat.send_message(data)
                        response_text = response.text
                    else:
                        response_text = "Sesi chat AI tidak dapat dimulai. Silakan periksa konfigurasi Anda."
                except Exception as e:
                    print(f"AI Processing error: {e}")
                    response_text = "Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti."
            
            await websocket.send_text(response_text)
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Websocket error: {e}")
        try:
            await websocket.send_text(f"Internal Server Error: {str(e)}")
        except:
            pass

@app.get("/")
def read_root():
    return {"status": "VibeCloset API sedang berjalan dengan sistem Auth aktif"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
