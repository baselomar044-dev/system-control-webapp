import asyncio
import json
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config import (
    ALLOWED_ORIGINS,
    API_HOST,
    API_PORT,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_USERNAME,
    RATE_LIMIT_DEFAULT,
)
from auth.jwt_handler import create_user, user_exists
from auth.auth_routes import router as auth_router
from routes.system_routes import router as system_router
from routes.file_routes import router as file_router
from routes.process_routes import router as process_router
from routes.command_routes import router as command_router
from routes.power_routes import router as power_router
from routes.app_routes import router as app_router
from routes.screenshot_routes import router as screenshot_router
from routes.agent_routes import router as agent_router
from services import system_monitor
from auth.jwt_handler import verify_token

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=[RATE_LIMIT_DEFAULT])


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not user_exists(DEFAULT_ADMIN_USERNAME):
        create_user(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, role="admin")
        logger.info("Default admin user created: %s", DEFAULT_ADMIN_USERNAME)
    else:
        logger.info("Admin user already exists: %s", DEFAULT_ADMIN_USERNAME)
    yield
    logger.info("Shutting down system-control-webapp backend")


app = FastAPI(
    title="System Control WebApp API",
    description="Backend API for monitoring and controlling the host system.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(system_router)
app.include_router(file_router)
app.include_router(process_router)
app.include_router(command_router)
app.include_router(power_router)
app.include_router(app_router)
app.include_router(screenshot_router)
app.include_router(agent_router)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred"},
    )


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token or not verify_token(token, token_type="access"):
        await websocket.close(code=4001)
        return

    await manager.connect(websocket)
    logger.info("WebSocket client connected: %s", websocket.client)
    try:
        while True:
            metrics = await system_monitor.get_system_summary()
            await websocket.send_json(metrics)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected: %s", websocket.client)
    except Exception as e:
        logger.warning("WebSocket error: %s", e)
    finally:
        manager.disconnect(websocket)


if __name__ == "__main__":
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=False, log_level="info")
