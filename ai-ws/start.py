#!/usr/bin/env python3
"""
Startup script for the AI WebSocket service
"""
import os
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Load environment variables from .env file if it exists
env_file = current_dir / '.env'
if env_file.exists():
    print("Loading environment variables from .env file...")
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, _, value = line.partition('=')
                os.environ[key] = value
                if key == 'OPENAI_API_KEY':
                    print(f"✓ Loaded {key}")

# Check if OpenAI API key is configured
if not os.getenv('OPENAI_API_KEY'):
    print("⚠️  WARNING: OPENAI_API_KEY not found!")
    print("   Please copy env.example to .env and add your OpenAI API key")
    print("   The service will start but AI responses will not work")
    print()

if __name__ == "__main__":
    import uvicorn
    from main import app
    
    print("🚀 Starting AI WebSocket Service...")
    print("📡 WebSocket endpoint: ws://localhost:8000/ws/{client_id}")
    print("🌐 HTTP health check: http://localhost:8000/health")
    print("🛑 Press Ctrl+C to stop")
    print()
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    ) 