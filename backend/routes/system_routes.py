from fastapi import APIRouter, Depends

from auth.auth_routes import get_current_user
from services import system_monitor

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/summary")
async def system_summary(current_user: dict = Depends(get_current_user)):
    return await system_monitor.get_system_summary()


@router.get("/cpu")
async def cpu_info(current_user: dict = Depends(get_current_user)):
    return await system_monitor.get_cpu_info()


@router.get("/memory")
async def memory_info(current_user: dict = Depends(get_current_user)):
    return await system_monitor.get_memory_info()


@router.get("/disk")
async def disk_info(current_user: dict = Depends(get_current_user)):
    return await system_monitor.get_disk_info()


@router.get("/network")
async def network_info(current_user: dict = Depends(get_current_user)):
    return await system_monitor.get_network_info()


@router.get("/temperature")
async def temperature_info(current_user: dict = Depends(get_current_user)):
    result = await system_monitor.get_temperature_info()
    if result is None:
        return {"available": False, "sensors": None}
    return {"available": True, "sensors": result}


@router.get("/uptime")
async def uptime_info(current_user: dict = Depends(get_current_user)):
    return await system_monitor.get_uptime()
