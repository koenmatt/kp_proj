import asyncio
import json
import os
import uuid
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel
import logging
import xml.etree.ElementTree as ET
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI WebSocket Service", version="1.0.0")

# CORS middleware to allow connections from the client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

# Message models
class ChatMessage(BaseModel):
    id: str
    content: str
    role: str  # "user" or "assistant"
    timestamp: str

class OpenAIRequest(BaseModel):
    messages: List[Dict[str, str]]
    stream: bool = True

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not found in environment variables")

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

def load_system_prompt() -> str:
    """Load the system prompt from prompt.txt file"""
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(script_dir, "prompt.txt")
        
        with open(prompt_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            logger.info(f"Loaded system prompt from {prompt_path} ({len(content)} characters)")
            return content
    except FileNotFoundError:
        logger.warning(f"prompt.txt file not found at {prompt_path}, using default prompt")
        return "You are a helpful AI assistant."
    except Exception as e:
        logger.error(f"Error loading prompt.txt: {e}")
        return "You are a helpful AI assistant."

def extract_tool_calls(text: str) -> List[Dict]:
    """Extract XML tool calls from the response text"""
    tool_calls = []
    
    # Find all COMPLETE tool_call XML blocks
    pattern = r'<tool_call>(.*?)</tool_call>'
    matches = re.findall(pattern, text, re.DOTALL)
    
    for match in matches:
        try:
            # Parse the XML content
            tool_xml = f"<tool_call>{match}</tool_call>"
            root = ET.fromstring(tool_xml)
            
            tool_name_elem = root.find('tool_name')
            parameters_elem = root.find('parameters')
            
            if tool_name_elem is not None and parameters_elem is not None:
                tool_call = {
                    'tool_name': tool_name_elem.text,
                    'parameters': {}
                }
                
                # Extract all parameters
                for param in parameters_elem:
                    if param.text:
                        tool_call['parameters'][param.tag] = param.text.strip()
                
                tool_calls.append(tool_call)
                
        except ET.ParseError as e:
            logger.debug(f"Error parsing tool call XML (likely incomplete): {e}")
            continue
    
    return tool_calls

async def execute_tool(tool_call: Dict, client_id: str) -> Dict:
    """Execute a tool call and return the result"""
    tool_name = tool_call['tool_name']
    parameters = tool_call['parameters']
    
    if tool_name == 'generate_quote':
        return await execute_generate_quote(parameters, client_id)
    elif tool_name == 'create_approval_flow':
        return await execute_create_approval_flow(parameters, client_id)
    else:
        logger.error(f"Unknown tool: {tool_name}")
        return {
            'success': False,
            'error': f"Unknown tool: {tool_name}"
        }

async def execute_generate_quote(parameters: Dict, client_id: str) -> Dict:
    """Execute the generate_quote tool"""
    logger.info(f"Executing generate_quote for client {client_id}")
    logger.info(f"Parameters: {parameters}")
    # Send status message to client
    status_msg = {
        "type": "tool_status",
        "tool_name": "generate_quote",
        "status": "Generating Quote",
        "message": "Creating your quote document..."
    }
    await manager.send_personal_message(json.dumps(status_msg), client_id)
    
    # Simulate processing time
    await asyncio.sleep(10)
    
    # Generate a mock file path
    quote_id = str(uuid.uuid4())
    file_path = f"/quotes/{quote_id}/quote_document.pdf"
    # Return completion result
    return {
        'success': True,
        'tool_name': 'generate_quote',
        'file_path': file_path,
        'quote_id': quote_id,
        'customer_name': parameters.get('customer_name', 'Unknown'),
        'quote_name': parameters.get('quote_name', 'Quote Document')
    }

async def execute_create_approval_flow(parameters: Dict, client_id: str) -> Dict:
    """Execute the create_approval_flow tool"""
    logger.info(f"Executing create_approval_flow for client {client_id}")
    
    # Simulate processing time
    await asyncio.sleep(1.5)
    
    # Generate a mock workflow ID and file
    workflow_id = str(uuid.uuid4())
    file_path = f"/workflows/{workflow_id}/approval_flow.json"
    
    # Return completion result
    return {
        'success': True,
        'tool_name': 'create_approval_flow',
        'file_path': file_path,
        'workflow_id': workflow_id,
        'flow_name': parameters.get('flow_name', 'Approval Workflow')
    }

def remove_tool_calls_from_content(content: str) -> str:
    """Remove XML tool calls from content to keep only user-visible text"""
    # Remove all tool_call XML blocks
    pattern = r'<tool_call>.*?</tool_call>'
    clean_content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    # Clean up extra whitespace
    clean_content = re.sub(r'\n\s*\n', '\n\n', clean_content)
    clean_content = clean_content.strip()
    
    return clean_content

def get_safe_content_to_stream(content_buffer: str, streamed_length: int) -> str:
    """Get the portion of content that can be safely streamed without showing XML"""
    
    # Get the new content since last stream
    new_content = content_buffer[streamed_length:]
    
    if not new_content:
        return ""
    
    # Check if there's any part of a tool call starting (even just '<tool' or '<to')
    tool_indicators = ['<tool_call', '<tool', '<to', '<t']
    
    for indicator in tool_indicators:
        tool_start = new_content.find(indicator)
        if tool_start != -1:
            # There's a potential tool call starting - only stream content before it
            safe_content = new_content[:tool_start]
            return safe_content
    
    # Check if we're currently inside a tool call (look backwards in the buffer)
    # Find the last tool_call start and end before our current position
    buffer_before_current = content_buffer[:streamed_length + len(new_content)]
    
    last_start = buffer_before_current.rfind('<tool_call>')
    last_end = buffer_before_current.rfind('</tool_call>')
    
    if last_start > last_end:
        # We're inside an incomplete tool call - don't stream anything
        return ""
    
    # Check if the content buffer contains any XML indicators after our streamed position
    remaining_buffer = content_buffer[streamed_length:]
    if any(indicator in remaining_buffer for indicator in ['<tool_call', '<tool', '<to']):
        # Be extra cautious - if we detect XML anywhere ahead, be more conservative
        safe_chars = 0
        for char in new_content:
            if char == '<':
                break
            safe_chars += 1
        return new_content[:safe_chars]
    
    # No tool call issues - stream the new content
    return new_content

async def execute_and_notify_tool(tool_call: Dict, client_id: str):
    """Execute a tool and send completion notification"""
    try:
        # Send tool XML to client for backend processing
        tool_xml_msg = {
            "type": "tool_call",
            "message_id": tool_call.get('message_id'),
            "tool_name": tool_call['tool_name'],
            "parameters": tool_call['parameters']
        }
        await manager.send_personal_message(json.dumps(tool_xml_msg), client_id)
        
        # Note: initial status is sent during streaming; this function is retained for compatibility.
        
        # Execute the tool
        result = await execute_tool(tool_call, client_id)
        
        if result['success']:
            # Send completion message
            completion_msg = {
                "type": "tool_complete",
                "message_id": tool_call.get('message_id'),
                "tool_name": result['tool_name'],
                "file_path": result['file_path'],
                "data": {k: v for k, v in result.items() if k not in ['success', 'tool_name', 'file_path']}
            }
            await manager.send_personal_message(json.dumps(completion_msg), client_id)
            logger.info(f"Tool {tool_call['tool_name']} completed successfully for client {client_id}")
        else:
            # Send error message
            error_msg = {
                "type": "tool_error",
                "message_id": tool_call.get('message_id'),
                "tool_name": tool_call['tool_name'],
                "error": result.get('error', 'Unknown error')
            }
            await manager.send_personal_message(json.dumps(error_msg), client_id)
            logger.error(f"Tool {tool_call['tool_name']} failed for client {client_id}: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Error executing tool {tool_call['tool_name']} for client {client_id}: {str(e)}")
        error_msg = {
            "type": "tool_error",
            "tool_name": tool_call['tool_name'],
            "error": str(e)
        }
        await manager.send_personal_message(json.dumps(error_msg), client_id)

async def execute_tool_only(tool_call: Dict, client_id: str):
    """Execute a tool without sending initial status (status already sent during streaming)"""
    try:
        # Send tool XML to client for backend processing
        tool_xml_msg = {
            "type": "tool_call",
            "message_id": tool_call.get('message_id'),
            "tool_name": tool_call['tool_name'],
            "parameters": tool_call['parameters']
        }
        await manager.send_personal_message(json.dumps(tool_xml_msg), client_id)
        
        # Execute the tool (status already sent during streaming)
        result = await execute_tool(tool_call, client_id)
        
        if result['success']:
            # Send completion message
            completion_msg = {
                "type": "tool_complete",
                "message_id": tool_call.get('message_id'),
                "tool_name": result['tool_name'],
                "file_path": result['file_path'],
                "data": {k: v for k, v in result.items() if k not in ['success', 'tool_name', 'file_path']}
            }
            await manager.send_personal_message(json.dumps(completion_msg), client_id)
            logger.info(f"Tool {tool_call['tool_name']} completed successfully for client {client_id}")
        else:
            # Send error message
            error_msg = {
                "type": "tool_error",
                "message_id": tool_call.get('message_id'),
                "tool_name": tool_call['tool_name'],
                "error": result.get('error', 'Unknown error')
            }
            await manager.send_personal_message(json.dumps(error_msg), client_id)
            logger.error(f"Tool {tool_call['tool_name']} failed for client {client_id}: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Error executing tool {tool_call['tool_name']} for client {client_id}: {str(e)}")
        error_msg = {
            "type": "tool_error",
            "tool_name": tool_call['tool_name'],
            "error": str(e)
        }
        await manager.send_personal_message(json.dumps(error_msg), client_id)

async def stream_openai_response(messages: List[Dict[str, str]], client_id: str):
    """Stream OpenAI chat completion response back to the client"""
    
    if not OPENAI_API_KEY:
        error_msg = {
            "type": "error",
            "message": "OpenAI API key not configured"
        }
        await manager.send_personal_message(json.dumps(error_msg), client_id)
        return
    
    # Load system prompt and prepend to messages
    system_prompt = load_system_prompt()
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-4o",
        "messages": full_messages,
        "stream": True,
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", OPENAI_API_URL, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    logger.error(f"OpenAI API error: {response.status_code} - {error_text}")
                    error_msg = {
                        "type": "error",
                        "message": f"OpenAI API error: {response.status_code}"
                    }
                    await manager.send_personal_message(json.dumps(error_msg), client_id)
                    return
                
                # Send start of response
                start_msg = {
                    "type": "response_start",
                    "message_id": str(uuid.uuid4())
                }
                await manager.send_personal_message(json.dumps(start_msg), client_id)
                
                current_message_id = start_msg["message_id"]
                
                content_buffer = ""
                streamed_length = 0  # Track how much content we've already streamed
                tool_calls_processed = set()  # Track processed tool calls to avoid duplicates
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]  # Remove "data: " prefix
                        
                        if data == "[DONE]":
                            # Process any remaining tool calls before finalizing
                            tool_calls = extract_tool_calls(content_buffer)
                            new_tool_calls = 0
                            for tool_call in tool_calls:
                                # Create a stable signature based on tool content
                                tool_signature = f"{tool_call['tool_name']}_{hash(json.dumps(tool_call['parameters'], sort_keys=True))}"
                                if tool_signature not in tool_calls_processed:
                                    tool_calls_processed.add(tool_signature)
                                    new_tool_calls += 1
                                    logger.info(f"Final buffer: executing {tool_call['tool_name']}")
                                    
                                    # Send status immediately for final buffer tools too
                                    status_msg = {
                                        "type": "tool_status",
                                        "message_id": current_message_id,
                                        "tool_name": tool_call['tool_name'],
                                        "status": "Generating Quote" if tool_call['tool_name'] == 'generate_quote' else "Creating Approval Flow",
                                        "message": "Creating your quote document..." if tool_call['tool_name'] == 'generate_quote' else "Setting up your approval workflow..."
                                    }
                                    await manager.send_personal_message(json.dumps(status_msg), client_id)
                                    logger.info(f"Sent final buffer status for {tool_call['tool_name']} to client {client_id}")
                                    
                                    # Execute tool in background (without sending status again)
                                    tool_call_with_id = {**tool_call, "message_id": current_message_id}
                                    asyncio.create_task(execute_tool_only(tool_call_with_id, client_id))
                            
                            if new_tool_calls == 0:
                                logger.debug("No new tool calls found in final buffer")
                            
                            # Stream any remaining safe content
                            remaining_safe_content = get_safe_content_to_stream(content_buffer, streamed_length)
                            if remaining_safe_content:
                                remaining_chunk_msg = {
                                    "type": "response_chunk",
                                    "message_id": current_message_id,
                                    "content": remaining_safe_content
                                }
                                await manager.send_personal_message(json.dumps(remaining_chunk_msg), client_id)
                            
                            # Remove tool calls from visible content for final message
                            clean_content = remove_tool_calls_from_content(content_buffer)
                            
                            # Send final message
                            final_msg = {
                                "type": "response_complete",
                                "message_id": current_message_id,
                                "content": clean_content
                            }
                            await manager.send_personal_message(json.dumps(final_msg), client_id)
                            break
                        
                        try:
                            chunk = json.loads(data)
                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                delta = chunk["choices"][0].get("delta", {})
                                if "content" in delta:
                                    content = delta["content"]
                                    content_buffer += content
                                    
                                    # Debug: Log content buffer periodically (only for long responses)
                                    if len(content_buffer) % 500 == 0:
                                        logger.debug(f"Content buffer length: {len(content_buffer)}")
                                    
                                    # Check for complete tool calls in the buffer
                                    tool_calls = extract_tool_calls(content_buffer)
                                    for tool_call in tool_calls:
                                        # Create a stable signature based on tool content
                                        tool_signature = f"{tool_call['tool_name']}_{hash(json.dumps(tool_call['parameters'], sort_keys=True))}"
                                        
                                        if tool_signature not in tool_calls_processed:
                                            tool_calls_processed.add(tool_signature)
                                            logger.info(f"Extracted tool call: {tool_call['tool_name']} (executing)")
                                            
                                            # Send status immediately when tool is detected (during streaming)
                                            status_msg = {
                                                "type": "tool_status",
                                                "message_id": current_message_id,
                                                "tool_name": tool_call['tool_name'],
                                                "status": "Generating Quote" if tool_call['tool_name'] == 'generate_quote' else "Creating Approval Flow",
                                                "message": "Creating your quote document..." if tool_call['tool_name'] == 'generate_quote' else "Setting up your approval workflow..."
                                            }
                                            await manager.send_personal_message(json.dumps(status_msg), client_id)
                                            logger.info(f"Sent immediate status for {tool_call['tool_name']} to client {client_id}")
                                            
                                            # Execute tool in background (without sending status again)
                                            tool_call_with_id = {**tool_call, "message_id": current_message_id}
                                            asyncio.create_task(execute_tool_only(tool_call_with_id, client_id))
                                        else:
                                            logger.debug(f"Skipping duplicate tool call: {tool_call['tool_name']}")
                                    
                                    # Determine what new content can be safely streamed
                                    safe_content = get_safe_content_to_stream(content_buffer, streamed_length)
                                    
                                    if safe_content:
                                        chunk_msg = {
                                            "type": "response_chunk",
                                            "message_id": current_message_id,
                                            "content": safe_content
                                        }
                                        await manager.send_personal_message(json.dumps(chunk_msg), client_id)
                                        streamed_length += len(safe_content)
                        
                        except json.JSONDecodeError:
                            continue  # Skip malformed chunks
                        
    except httpx.TimeoutException:
        error_msg = {
            "type": "error",
            "message": "Request to OpenAI timed out"
        }
        await manager.send_personal_message(json.dumps(error_msg), client_id)
    except Exception as e:
        logger.error(f"Error streaming OpenAI response: {str(e)}")
        error_msg = {
            "type": "error",
            "message": f"Error processing request: {str(e)}"
        }
        await manager.send_personal_message(json.dumps(error_msg), client_id)

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                logger.info(f"Received message from {client_id}: {message_data}")
                
                # Extract message type
                if "type" in message_data:
                    if message_data["type"] == "chat_message":
                        # Handle chat message
                        user_message = message_data.get("message", {})
                        conversation_history = message_data.get("history", [])
                        
                        # Add the current message to history
                        messages = []
                        for msg in conversation_history:
                            messages.append({
                                "role": msg["role"],
                                "content": msg["content"]
                            })
                        
                        # Add current user message
                        messages.append({
                            "role": "user",
                            "content": user_message.get("content", "")
                        })
                        
                        # Stream OpenAI response
                        await stream_openai_response(messages, client_id)
                    
                    elif message_data["type"] == "ping":
                        # Respond to ping with pong
                        pong_msg = {"type": "pong"}
                        await manager.send_personal_message(json.dumps(pong_msg), client_id)
                        
                else:
                    # Legacy format support - treat as direct message
                    if "content" in message_data:
                        messages = [{"role": "user", "content": message_data["content"]}]
                        await stream_openai_response(messages, client_id)
                        
            except json.JSONDecodeError:
                error_msg = {
                    "type": "error",
                    "message": "Invalid JSON format"
                }
                await manager.send_personal_message(json.dumps(error_msg), client_id)
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {str(e)}")
        manager.disconnect(client_id)

@app.get("/")
async def root():
    return {
        "message": "AI WebSocket Service",
        "status": "running",
        "active_connections": len(manager.active_connections)
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "active_connections": len(manager.active_connections),
        "openai_configured": bool(OPENAI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 