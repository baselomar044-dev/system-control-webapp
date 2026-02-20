from fastapi import APIRouter, Depends, Query

from auth.auth_routes import get_current_user, require_admin
from services import power_manager

router = APIRouter(prefix="/power", tags=["power"])


@router.post("/shutdown")
async def shutdown(
    delay_seconds: int = Query(0, ge=0, le=3600),
    current_user: dict = Depends(require_admin),
):
    return power_manager.shutdown(delay_seconds=delay_seconds)


@router.post("/restart")
async def restart(
    delay_seconds: int = Query(0, ge=0, le=3600),
    current_user: dict = Depends(require_admin),
):
    return power_manager.restart(delay_seconds=delay_seconds)


@router.post("/sleep")
async def sleep(current_user: dict = Depends(get_current_user)):
    return power_manager.sleep_system()


@router.post("/lock")
async def lock(current_user: dict = Depends(get_current_user)):
    return power_manager.lock_screen()


@router.post("/cancel-shutdown")
async def cancel_shutdown(current_user: dict = Depends(require_admin)):
    return power_manager.cancel_shutdown()
