import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

try:
    print("Testing gemini-embedding-2...")
    response = client.models.embed_content(
        model="gemini-embedding-2",
        contents="Hello world"
    )
    print(f"Embedding size: {len(response.embeddings[0].values)}")
except Exception as e:
    print(f"Error testing gemini-embedding-2: {e}")

try:
    print("Testing gemini-embedding-001...")
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents="Hello world"
    )
    print(f"Embedding size: {len(response.embeddings[0].values)}")
except Exception as e:
    print(f"Error testing gemini-embedding-001: {e}")
