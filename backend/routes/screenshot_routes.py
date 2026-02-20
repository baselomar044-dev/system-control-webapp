from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from auth.auth_routes import get_current_user
from services import screenshot as screenshot_service

router = APIRouter(prefix="/screenshots", tags=["screenshots"])


@router.post("/take")
async def take_screenshot(
    save_to_disk: bool = True,
    current_user: dict = Depends(get_current_user),
):
    result = screenshot_service.take_screenshot(save_to_disk=save_to_disk)
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Screenshot failed"),
        )
    return result


@router.get("/list")
async def list_screenshots(current_user: dict = Depends(get_current_user)):
    return {"screenshots": screenshot_service.list_screenshots()}


@router.get("/get/{filename}")
async def get_screenshot(filename: str, current_user: dict = Depends(get_current_user)):
    result = screenshot_service.get_screenshot_as_base64(filename)
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("error", "Not found"))
    return result


@router.delete("/delete/{filename}")
async def delete_screenshot(filename: str, current_user: dict = Depends(get_current_user)):
    result = screenshot_service.delete_screenshot(filename)
    if not result.get("deleted"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("error", "Not found"))
    return result
