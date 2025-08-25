#!/usr/bin/env python3
"""
Test client for the AI WebSocket service
"""
import asyncio
import websockets
import json
import uuid

async def test_websocket():
    client_id = str(uuid.uuid4())
    uri = f"ws://localhost:8000/ws/{client_id}"
    
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ Connected to WebSocket")
            
            # Send a test message
            test_message = {
                "type": "chat_message",
                "message": {
                    "id": str(uuid.uuid4()),
                    "content": "Hello, AI! This is a test message.",
                    "role": "user",
                    "timestamp": "2024-01-01T00:00:00Z"
                },
                "history": []
            }
            
            print("Sending test message...")
            await websocket.send(json.dumps(test_message))
            
            # Listen for responses
            response_content = ""
            while True:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=30)
                    data = json.loads(response)
                    
                    print(f"Received: {data['type']}")
                    
                    if data['type'] == 'response_chunk':
                        response_content += data['content']
                        print(f"Chunk: {data['content']}", end='', flush=True)
                    elif data['type'] == 'response_complete':
                        print(f"\n✓ Complete response: {data['content'][:100]}...")
                        break
                    elif data['type'] == 'error':
                        print(f"❌ Error: {data['message']}")
                        break
                        
                except asyncio.TimeoutError:
                    print("⏱️  Timeout waiting for response")
                    break
                    
    except ConnectionRefusedError:
        print("❌ Connection refused. Is the WebSocket server running?")
        print("   Start the server with: python start.py")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🧪 Testing AI WebSocket Service")
    print("Make sure the server is running first!")
    print()
    
    asyncio.run(test_websocket()) 