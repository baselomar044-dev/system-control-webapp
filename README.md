# System Control Web Application

A comprehensive web application for remote control and monitoring of a laptop/server through a web interface, powered by an AI agent using LangChain.

## Features

- **Dashboard** – Real-time CPU, memory, and disk metrics with live charts
- **File Manager** – Browse, create, upload, download, and delete files
- **Process Manager** – View and kill running processes
- **Terminal** – Execute shell commands remotely with output streaming
- **Power Controls** – Shutdown, restart, sleep, and lock screen
- **App Launcher** – List and launch installed applications
- **Screen Viewer** – Capture and view screenshots
- **AI Agent Chat** – Natural language interface powered by LangChain

## Tech Stack

**Backend:** FastAPI · psutil · LangChain · Pillow · PyJWT · bcrypt · WebSockets  
**Frontend:** React 18 · Material UI · Recharts · Axios · TanStack Query

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

### 1. Clone and configure

```bash
git clone <repo-url>
cd system-control-webapp
cp .env.example .env
# Edit .env with your settings
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend starts at http://localhost:8000. API docs available at http://localhost:8000/docs.

Default credentials: **admin / admin123** (change in `.env`)

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

The frontend starts at http://localhost:3000.

### 4. Docker Compose (optional)

```bash
docker-compose up --build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing secret | (required) |
| `API_PORT` | Backend port | `8000` |
| `OPENAI_API_KEY` | OpenAI key for AI agent | (optional) |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `DEFAULT_ADMIN_USERNAME` | Initial admin username | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | `admin123` |

## API Documentation

Full interactive API docs available at `http://localhost:8000/docs` when the backend is running.

### Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Authenticate and get JWT |
| GET | `/system/info` | Full system information |
| WS | `/ws/metrics` | Real-time metric stream |
| GET | `/files/list` | List directory contents |
| GET | `/processes/list` | List running processes |
| POST | `/commands/execute` | Execute shell command |
| GET | `/screenshots/capture` | Take a screenshot |
| POST | `/agent/chat` | Send message to AI agent |

## AI Agent Usage

The AI agent understands natural language commands when an `OPENAI_API_KEY` is configured:

- *"Show me the current CPU and memory usage"*
- *"List the top 10 processes by CPU"*
- *"Take a screenshot"*
- *"What files are in the home directory?"*
- *"Run the command `df -h`"*

## Security Considerations

- Change `SECRET_KEY` and `DEFAULT_ADMIN_PASSWORD` before deploying
- The backend enforces a command blacklist to prevent destructive shell commands
- All file operations validate paths to prevent directory traversal
- Rate limiting is applied to all endpoints
- Power management endpoints require admin role
- Use HTTPS in production (reverse proxy with nginx/caddy recommended)

## Project Structure

```
system-control-webapp/
├── backend/
│   ├── main.py              # FastAPI app, WebSocket endpoint
│   ├── config.py            # Environment variable configuration
│   ├── requirements.txt
│   ├── auth/
│   │   ├── jwt_handler.py   # JWT creation/verification, bcrypt hashing
│   │   └── auth_routes.py   # /auth/login, /refresh, /logout, /me
│   ├── services/
│   │   ├── system_monitor.py
│   │   ├── file_manager.py
│   │   ├── process_manager.py
│   │   ├── command_executor.py
│   │   ├── power_manager.py
│   │   ├── app_launcher.py
│   │   └── screenshot.py
│   ├── agent/
│   │   ├── tools.py         # LangChain tools wrapping services
│   │   └── langchain_agent.py
│   └── routes/
│       ├── system_routes.py
│       ├── file_routes.py
│       ├── process_routes.py
│       ├── command_routes.py
│       ├── power_routes.py
│       ├── app_routes.py
│       ├── screenshot_routes.py
│       └── agent_routes.py
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.jsx
│       ├── index.jsx
│       ├── components/
│       │   ├── Dashboard.jsx
│       │   ├── FileManager.jsx
│       │   ├── ProcessManager.jsx
│       │   ├── Terminal.jsx
│       │   ├── PowerControls.jsx
│       │   ├── AppLauncher.jsx
│       │   ├── ScreenViewer.jsx
│       │   ├── AgentChat.jsx
│       │   └── Login.jsx
│       ├── hooks/useWebSocket.js
│       ├── services/api.js
│       └── utils/auth.js
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```
