import asyncio
import websockets
import httpx

async def test_ws():
    # 1. Login to get token
    async with httpx.AsyncClient() as client:
        # Register if not exists (ignoring error if already exists)
        await client.post("http://127.0.0.1:8000/api/auth/register", 
                         json={"username": "wsuser", "email": "ws@example.com", "password": "password123"})
        
        login_res = await client.post("http://127.0.0.1:8000/api/auth/login", 
                                     data={"username": "wsuser", "password": "password123"})
        token = login_res.json().get("access_token")
        
    if not token:
        print("Failed to get token")
        return

    uri = f"ws://127.0.0.1:8000/ws/stylist?token={token}"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            welcome = await websocket.recv()
            print(f"Welcome: {welcome}")
            await websocket.send("Halo")
            response = await websocket.recv()
            print(f"Response: {response}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
