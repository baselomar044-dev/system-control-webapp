from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.auth_routes import get_current_user
from services import process_manager

router = APIRouter(prefix="/processes", tags=["processes"])


@router.get("/list")
async def list_processes(
    sort_by: str = Query("cpu_percent", description="Sort field: pid, name, cpu_percent, memory_percent, status"),
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    return {"processes": process_manager.list_processes(sort_by=sort_by, limit=limit)}


@router.get("/count")
async def process_count(current_user: dict = Depends(get_current_user)):
    return process_manager.get_process_count()


@router.get("/{pid}")
async def get_process(pid: int, current_user: dict = Depends(get_current_user)):
    try:
        return process_manager.get_process_details(pid)
    except ProcessLookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.delete("/{pid}")
async def kill_process(
    pid: int,
    force: bool = Query(False, description="Force kill (SIGKILL) instead of terminate (SIGTERM)"),
    current_user: dict = Depends(get_current_user),
):
    try:
        return process_manager.kill_process(pid, force=force)
    except ProcessLookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
