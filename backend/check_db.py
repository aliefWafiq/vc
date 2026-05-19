import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        result = conn.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
        extension = result.fetchone()
        if extension:
            print("pgvector extension is ENABLED")
        else:
            print("pgvector extension is NOT ENABLED")
            # Try to enable it
            print("Attempting to enable pgvector extension...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
            print("pgvector extension ENABLED successfully")
    except Exception as e:
        print(f"Error checking/enabling pgvector: {e}")
