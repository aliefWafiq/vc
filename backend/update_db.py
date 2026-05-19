import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def update_database():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    try:
        # Connect to Supabase
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Enabling vector extension...")
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

        print("Adding columns to clothes table...")
        # Check if columns exist first to be safe, or use ADD COLUMN IF NOT EXISTS if supported (Postgres 9.6+)
        cur.execute("ALTER TABLE clothes ADD COLUMN IF NOT EXISTS embedding vector(768);")
        cur.execute("ALTER TABLE clothes ADD COLUMN IF NOT EXISTS last_worn timestamptz;")
        cur.execute("ALTER TABLE clothes ADD COLUMN IF NOT EXISTS description text;")

        conn.commit()
        print("Database updated successfully!")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    update_database()
