from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.auth_routes import get_current_user
from services import app_launcher

router = APIRouter(prefix="/apps", tags=["apps"])


class LaunchRequest(BaseModel):
    app: str


class CloseRequest(BaseModel):
    process_name: str


@router.get("/list")
async def list_applications(current_user: dict = Depends(get_current_user)):
    apps = app_launcher.list_applications()
    return {"applications": apps, "total": len(apps)}


@router.post("/launch")
async def launch_application(
    body: LaunchRequest,
    current_user: dict = Depends(get_current_user),
):
    if not body.app.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="App name cannot be empty")
    return app_launcher.launch_application(body.app)


@router.post("/close")
async def close_application(
    body: CloseRequest,
    current_user: dict = Depends(get_current_user),
):
    if not body.process_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Process name cannot be empty")
    return app_launcher.close_application(body.process_name)
