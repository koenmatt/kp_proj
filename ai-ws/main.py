import asyncio
import json
import os
import uuid
from typing import Dict, List
from datetime import datetime, timedelta
import io
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import httpx
from pydantic import BaseModel
import logging
import xml.etree.ElementTree as ET
import re
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI WebSocket Service", version="1.0.0")

# CORS middleware to allow connections from the client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://kp-proj.vercel.app"],  # Next.js default ports + production
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

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    logger.warning("Supabase configuration not found in environment variables")
    supabase_client = None
else:
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

async def generate_quote_content_with_llm(parameters: Dict) -> Dict:
    """Use LLM to generate detailed quote content"""
    if not OPENAI_API_KEY:
        return {
            "product_description": parameters.get('product', 'Product'),
            "unit_price": 100.0,
            "total_price": float(parameters.get('quantity', 1)) * 100.0,
            "terms": "Standard terms and conditions apply."
        }
    
    prompt = f"""
    Generate a realistic business quote for the following request:
    - Customer: {parameters.get('customer_name', 'Customer')}
    - Product: {parameters.get('product', 'Software License')}
    - Quantity: {parameters.get('quantity', '1')}
    - Discount: {parameters.get('discount', 'None')}
    - Requirements: {parameters.get('requirements', 'Standard requirements')}
    
    Provide a JSON response with:
    - product_description: Concise description (max 100 words) of the product/service
    - unit_price: Realistic unit price in USD (between $50-$500 for software licenses)
    - total_price: Total price after discount in USD (numeric value only)
    - terms: Brief professional terms (2-3 sentences)
    - additional_notes: Short benefits summary (2-3 sentences)
    
    Keep pricing realistic for B2B software (not millions of dollars). Make descriptions concise and professional.
    """
    
    try:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 500
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(OPENAI_API_URL, json=payload, headers=headers)
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                # Try to parse JSON from the response
                try:
                    import json
                    # Clean the content - sometimes LLM adds markdown formatting
                    clean_content = content.strip()
                    if clean_content.startswith('```json'):
                        clean_content = clean_content.replace('```json', '').replace('```', '').strip()
                    elif clean_content.startswith('```'):
                        clean_content = clean_content.replace('```', '').strip()
                    
                    quote_data = json.loads(clean_content)
                    
                    # Validate required fields and convert strings to numbers if needed
                    if 'unit_price' in quote_data:
                        quote_data['unit_price'] = float(str(quote_data['unit_price']).replace('$', '').replace(',', ''))
                    if 'total_price' in quote_data:
                        quote_data['total_price'] = float(str(quote_data['total_price']).replace('$', '').replace(',', ''))
                    
                    return quote_data
                except (json.JSONDecodeError, ValueError, KeyError) as e:
                    # Fallback if JSON parsing fails
                    logger.warning(f"Failed to parse LLM response as JSON ({e}), using fallback. Content: {content[:200]}...")
                    
                    # Calculate prices manually with realistic values
                    quantity = float(parameters.get('quantity', 1))
                    unit_price = 199.0  # More reasonable base price
                    discount_pct = 0
                    if parameters.get('discount'):
                        try:
                            discount_pct = float(parameters.get('discount', '0').replace('%', '')) / 100
                        except ValueError:
                            discount_pct = 0
                    
                    total_price = quantity * unit_price * (1 - discount_pct)
                    
                    return {
                        "product_description": f"Professional {parameters.get('product', 'Software License')} designed for enterprise organizations. Includes standard features and basic support.",
                        "unit_price": unit_price,
                        "total_price": total_price,
                        "terms": "Payment due within 30 days. One year warranty included.",
                        "additional_notes": "Professional implementation support available. Regular updates included in first year."
                    }
    except Exception as e:
        logger.error(f"Error generating quote content with LLM: {e}")
        return {
            "product_description": f"Professional {parameters.get('product', 'Software License')}",
            "unit_price": 100.0,
            "total_price": float(parameters.get('quantity', 1)) * 100.0,
            "terms": "Standard terms and conditions apply.",
            "additional_notes": "Professional service delivery."
        }

def create_quote_pdf(parameters: Dict, quote_content: Dict, quote_id: str) -> bytes:
    """Create a professionally styled PDF quote"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#2c3e50')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor('#34495e')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6
    )
    
    # Build the PDF content
    story = []
    
    # Header
    story.append(Paragraph("BUSINESS PROPOSAL", title_style))
    story.append(Spacer(1, 20))
    
    # Quote details
    quote_info = [
        ['Proposal ID:', quote_id[:8].upper()],  # Shorter, cleaner ID
        ['Date:', datetime.now().strftime('%B %d, %Y')],
        ['Customer:', parameters.get('customer_name', 'Customer')],
        ['Valid Until:', (datetime.now() + timedelta(days=30)).strftime('%B %d, %Y')]
    ]
    
    info_table = Table(quote_info, colWidths=[2*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 30))
    
    # Product details
    story.append(Paragraph("PROPOSAL DETAILS", heading_style))
    
    # Create description as a Paragraph for proper text wrapping
    description_text = quote_content.get('product_description', parameters.get('product', 'Product'))
    # Limit description length for better formatting
    if len(description_text) > 150:
        description_text = description_text[:150] + "..."
    
    description_para = Paragraph(description_text, normal_style)
    
    product_data = [
        ['Description', 'Qty', 'Unit Price', 'Subtotal'],
        [
            description_para,
            str(parameters.get('quantity', '1')),
            f"${quote_content.get('unit_price', 100):.2f}",
            f"${float(parameters.get('quantity', 1)) * quote_content.get('unit_price', 100):.2f}"
        ]
    ]
    
    if parameters.get('discount') and parameters.get('discount') != 'None':
        discount_amount = float(parameters.get('quantity', 1)) * quote_content.get('unit_price', 100) - quote_content.get('total_price', 100)
        product_data.append([
            Paragraph(f"Discount ({parameters.get('discount')})", normal_style),
            '',
            '',
            f"-${discount_amount:.2f}"
        ])
    
    # Adjusted column widths for better fit
    product_table = Table(product_data, colWidths=[3.5*inch, 0.7*inch, 1*inch, 1.1*inch])
    product_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Description column left-aligned
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),  # Vertical alignment
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8f9fa'), colors.white]),
    ]))
    story.append(product_table)
    story.append(Spacer(1, 30))
    
    # Total
    total_data = [
        ['TOTAL AMOUNT:', f"${quote_content.get('total_price', 100):,.2f}"]
    ]
    total_table = Table(total_data, colWidths=[4.6*inch, 1.4*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 16),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e3f2fd')),
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#1976d2')),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 30))
    
    # Terms and conditions
    story.append(Paragraph("TERMS & CONDITIONS", heading_style))
    story.append(Paragraph(quote_content.get('terms', 'Standard terms and conditions apply.'), normal_style))
    
    if quote_content.get('additional_notes'):
        story.append(Spacer(1, 15))
        story.append(Paragraph("BENEFITS & NOTES", heading_style))
        story.append(Paragraph(quote_content.get('additional_notes'), normal_style))
    
    # Footer
    story.append(Spacer(1, 40))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    story.append(Paragraph("Thank you for considering our proposal. We look forward to working with you!", footer_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

async def upload_pdf_to_supabase(pdf_bytes: bytes, filename: str) -> str:
    """Upload PDF to Supabase storage and return presigned URL"""
    if not supabase_client:
        # Fallback for development - save locally and serve via FastAPI
        logger.warning("Supabase not configured, saving locally and serving via FastAPI")
        
        # Create temp directory if it doesn't exist
        temp_dir = os.path.join(os.path.dirname(__file__), "temp_pdfs")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save PDF locally
        local_file_path = os.path.join(temp_dir, filename)
        with open(local_file_path, "wb") as f:
            f.write(pdf_bytes)
        
        # Return local server URL
        return f"http://localhost:8000/download/{filename}"
    
    try:
        # Upload to Supabase storage with proper content type
        result = supabase_client.storage.from_("quotes").upload(
            filename, 
            pdf_bytes,
            file_options={
                "content-type": "application/pdf",
                "cache-control": "3600"
            }
        )
        
        if result:
            # Create a presigned URL that expires in 1 hour
            signed_url_result = supabase_client.storage.from_("quotes").create_signed_url(filename, 3600)
            
            if signed_url_result and 'signedURL' in signed_url_result:
                return signed_url_result['signedURL']
            else:
                logger.error("Failed to create signed URL")
                return f"https://supabase-fallback.com/quotes/{filename}"
        else:
            logger.error("Failed to upload PDF to Supabase")
            return f"https://supabase-fallback.com/quotes/{filename}"
            
    except Exception as e:
        logger.error(f"Error uploading to Supabase: {e}")
        return f"https://supabase-fallback.com/quotes/{filename}"

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
    """Execute the generate_quote tool with real PDF generation"""
    logger.info(f"Executing generate_quote for client {client_id}")
    logger.info(f"Parameters: {parameters}")
    
    try:
        # Generate quote ID
        quote_id = str(uuid.uuid4())
        
        # Step 1: Generate quote content using LLM
        logger.info("Generating quote content with LLM...")
        quote_content = await generate_quote_content_with_llm(parameters)
        logger.info(f"Generated quote content: {quote_content}")
        
        # Step 2: Create PDF
        logger.info("Creating PDF document...")
        pdf_bytes = create_quote_pdf(parameters, quote_content, quote_id)
        logger.info(f"Created PDF with {len(pdf_bytes)} bytes")
        
        # Step 3: Upload to Supabase and get presigned URL
        filename = f"{quote_id}_quote_{parameters.get('customer_name', 'customer').replace(' ', '_')}.pdf"
        logger.info(f"Uploading to Supabase as {filename}...")
        presigned_url = await upload_pdf_to_supabase(pdf_bytes, filename)
        logger.info(f"Upload complete, presigned URL: {presigned_url}")
        
        # Return completion result
        return {
            'success': True,
            'tool_name': 'generate_quote',
            'file_path': presigned_url,  # Now a presigned URL ready for download
            'quote_id': quote_id,
            'customer_name': parameters.get('customer_name', 'Unknown'),
            'quote_name': parameters.get('quote_name', 'Quote Document'),
            'filename': filename,
            'total_amount': quote_content.get('total_price', 0)
        }
        
    except Exception as e:
        logger.error(f"Error generating quote: {e}")
        return {
            'success': False,
            'tool_name': 'generate_quote',
            'error': f"Failed to generate quote: {str(e)}"
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