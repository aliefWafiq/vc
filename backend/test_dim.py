import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

try:
    print("Testing gemini-embedding-001 with output_dimensionality=768...")
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents="Hello world",
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    print(f"Embedding size: {len(response.embeddings[0].values)}")
except Exception as e:
    print(f"Error: {e}")
