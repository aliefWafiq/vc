import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"Using API Key: {GEMINI_API_KEY[:10]}...")

try:
    client = genai.Client(api_key=GEMINI_API_KEY)
    chat = client.chats.create(model="gemini-1.5-flash")
    response = chat.send_message("Halo")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
