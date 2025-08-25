# AI WebSocket Service

A concurrent WebSocket service that streams AI responses from OpenAI's Chat Completions API to the canyon-ai-client.

## Features

- **Concurrent WebSocket connections**: Handle multiple clients simultaneously
- **OpenAI API integration**: Stream responses from GPT models using httpx (async)
- **Real-time streaming**: Chunk-by-chunk response streaming for better UX
- **Connection management**: Track and manage active WebSocket connections
- **Error handling**: Robust error handling for API failures and network issues
- **CORS support**: Pre-configured for Next.js development

## Setup

1. **Install uv** (if not already installed):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   # or with homebrew: brew install uv
   ```

2. **Initialize the project**:
   ```bash
   uv init --no-readme
   ```

4. **Configure OpenAI API**:
   ```bash
   cp env.example .env
   # Edit .env and add your OpenAI API key
   ```

5. **Run the server**:
   ```bash
   uv run python start.py
   ```
   
   Or with uvicorn directly:
   ```bash
   uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

### WebSocket
- `wss://kp-proj.onrender.com/ws/{client_id}` - WebSocket endpoint for AI chat

### HTTP
- `GET /` - Service status and active connections count
- `GET /health` - Health check endpoint

## Usage

### Connect from Client
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/unique-client-id');

// Send a chat message
ws.send(JSON.stringify({
  type: "chat_message",
  message: {
    content: "Hello, AI!",
    role: "user"
  },
  history: [] // Previous conversation history
}));

// Listen for responses
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'response_start':
      // AI response is starting
      break;
    case 'response_chunk':
      // Stream chunk received
      console.log(data.content);
      break;
    case 'response_complete':
      // Response finished
      break;
    case 'error':
      // Handle error
      console.error(data.message);
      break;
  }
};
```

### Message Types

#### Client to Server
- `chat_message`: Send a new chat message with conversation history
- `ping`: Heartbeat to check connection

#### Server to Client
- `response_start`: AI response is beginning
- `response_chunk`: Streaming content chunk
- `response_complete`: Response finished with full content
- `pong`: Response to ping
- `error`: Error message

## Architecture

- **FastAPI**: Web framework with WebSocket support
- **httpx**: Async HTTP client for OpenAI API calls
- **Connection Manager**: Tracks active WebSocket connections
- **Streaming**: Real-time response streaming for better UX
- **Error Handling**: Comprehensive error handling and logging

## Development

The server runs on `http://localhost:8000` and is configured to accept connections from Next.js development server (`http://localhost:3000`) and production app (`https://kp-proj.vercel.app`).

For production, update the CORS origins in `main.py` to match your deployment URLs.

## Testing

Test the WebSocket connection:
```bash
uv run python client_test.py
``` 