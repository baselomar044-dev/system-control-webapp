from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from auth.auth_routes import get_current_user
from services import command_executor

router = APIRouter(prefix="/commands", tags=["commands"])


class ExecuteRequest(BaseModel):
    command: str
    timeout: int = 30
    working_dir: str | None = None


@router.post("/execute")
async def execute_command(
    body: ExecuteRequest,
    current_user: dict = Depends(get_current_user),
):
    if not body.command.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Command cannot be empty")
    result = await command_executor.execute_command(
        body.command,
        timeout=min(body.timeout, 120),
        working_dir=body.working_dir,
    )
    return result


@router.get("/history")
async def get_history(
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    return {"history": command_executor.get_history(limit=limit)}


@router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    return command_executor.clear_history()
