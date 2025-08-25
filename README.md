# Canyon AI

A modern Quote-to-Cash (QTC) platform that automates the entire sales process from quote creation to revenue recognition using AI-native technology.

## 🏗️ Architecture

This project consists of two main components:

### 🤖 AI WebSocket Service (`ai-ws/`)
A FastAPI-based backend service that provides real-time AI assistance through WebSocket connections. It integrates with OpenAI's GPT models to power intelligent quote generation, workflow automation, and business process optimization.

### 🌐 Canyon AI Client (`canyon-ai-client/`)
A Next.js 15 frontend application built with TypeScript, Tailwind CSS, and shadcn/ui components. Features include user authentication via Supabase, responsive dashboard, quote management, and real-time AI chat integration.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.13 or higher) 
- **uv** package manager for Python
- **OpenAI API Key**
- **Supabase Account** (for authentication and database)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd kp_proj
```

### 2. Setup AI WebSocket Service (Backend)

```bash
# Navigate to the AI service directory
cd ai-ws

# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh
# or with homebrew: brew install uv

# Install dependencies
uv sync

# Configure environment variables
cp env.example .env
# Edit .env and add your API keys:
# - OPENAI_API_KEY=your_openai_api_key_here
# - SUPABASE_URL=https://your-project.supabase.co
# - SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

# Start the WebSocket service
uv run python start.py
```

The AI service will be available at `http://localhost:8000`

### 3. Setup Canyon AI Client (Frontend)

```bash
# Navigate to the client directory (from project root)
cd canyon-ai-client

# Install dependencies
npm install

# Configure Supabase (create .env.local)
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
EOF

# Start the development server
npm run dev
```

The client application will be available at `http://localhost:3000`

## 🔧 Development Workflow

1. **Start the AI service**: Ensure the WebSocket service is running on port 8000
2. **Start the client**: Launch the Next.js development server on port 3000
3. **Access the app**: Navigate to `http://localhost:3000` in your browser

### Available Scripts

#### AI WebSocket Service
```bash
cd ai-ws
uv run python start.py              # Start with auto-reload
uv run python client_test.py        # Test WebSocket connection
uv run uvicorn main:app --reload    # Alternative start method
```

#### Canyon AI Client
```bash
cd canyon-ai-client
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔐 Authentication Setup

The application uses **Supabase Authentication** with Google OAuth:

1. Create a [Supabase](https://supabase.com) project
2. Enable Google OAuth in Authentication > Providers
3. Add your domain to the allowed origins
4. Copy your project URL and keys to the environment files

## 📡 API Integration

### WebSocket Connection
The client connects to the AI service via WebSocket for real-time chat:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/{client_id}');
```

### Message Types
- **Client → Server**: `chat_message`, `ping`
- **Server → Client**: `response_start`, `response_chunk`, `response_complete`, `error`, `pong`

## 🎨 Tech Stack

### Backend (ai-ws)
- **FastAPI**: Modern async web framework
- **WebSockets**: Real-time communication
- **httpx**: Async HTTP client for OpenAI API
- **Supabase**: Database and real-time features
- **uv**: Fast Python package manager

### Frontend (canyon-ai-client)
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS 4**: Utility-first styling
- **shadcn/ui**: High-quality component library
- **Supabase**: Authentication and database client
- **Recharts**: Data visualization

## 🌟 Key Features

- **🔐 Secure Authentication**: Google OAuth integration
- **🤖 AI-Powered Assistance**: Real-time chat with GPT models
- **📊 Quote Management**: Create, edit, and track quotes
- **⚡ Real-time Updates**: WebSocket-based live communication
- **🎨 Modern UI**: Responsive design with dark/light theme support
- **📱 Mobile-First**: Optimized for all device sizes
- **🔍 Type Safety**: Full TypeScript coverage

## 🚀 Deployment

### AI WebSocket Service
Deployed on Render

### Canyon AI Client
Deployed on Vercel

### Environment Variables
Ensure all production environment variables are configured with your production URLs and API keys.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
6. Ignore the lack of branch protections

## 📝 Extensions & Roadmap

- [ ] **Prisma Integration**: Replace Supabase with Prisma for type-safe database queries
- [ ] **Deny/edit pdf** Allow AI to edit PDF (deny button intead of just approve).
- [ ] **Create Approval Workflow w AI** AI keeps asking about approval workflow, builds in realtime with the customer.
- [ ] **Advanced Analytics**: Enhanced reporting and insights + connect to real data
- [ ] **Multi-tenant Support**: Support for multiple organizations
- [ ] **API Rate Limiting**: Implement request throttling + auth lol
- [ ] **Automated Testing**: Comprehensive test coverage
- [ ] **Audit Sync FastAPI**: Just realized I used Supabase sync client on ws server. Needs to be async otherwise will block event loop and be slow at scale.

## 📄 License

This code is mine don't steal pls.

---



