from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.auth_routes import get_current_user
from agent import langchain_agent

router = APIRouter(prefix="/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


@router.post("/chat")
async def agent_chat(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    if not body.message.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")
    result = langchain_agent.chat(body.message, session_id=body.session_id)
    if result.get("blocked"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["response"])
    return result


@router.post("/reset")
async def reset_agent(current_user: dict = Depends(get_current_user)):
    return langchain_agent.reset_memory()


@router.get("/status")
async def agent_status(current_user: dict = Depends(get_current_user)):
    from config import OPENAI_API_KEY, OPENAI_MODEL
    return {
        "openai_configured": bool(OPENAI_API_KEY),
        "model": OPENAI_MODEL if OPENAI_API_KEY else None,
        "fallback_mode": not bool(OPENAI_API_KEY),
    }
