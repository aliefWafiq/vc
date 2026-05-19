import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

print(f"API Key: {GEMINI_API_KEY[:5]}...{GEMINI_API_KEY[-5:]}")
print(f"Model: {GEMINI_MODEL}")

client = genai.Client(api_key=GEMINI_API_KEY)

try:
    print("Testing generate_content...")
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents="Hello, are you there?"
    )
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error testing generate_content: {e}")

try:
    print("Testing embed_content...")
    response = client.models.embed_content(
        model="text-embedding-004",
        contents="Hello world"
    )
    print(f"Embedding size: {len(response.embeddings[0].values)}")
except Exception as e:
    print(f"Error testing embed_content: {e}")
