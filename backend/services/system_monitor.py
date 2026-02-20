import asyncio
import time
from typing import Any, Optional

import psutil


async def get_cpu_info() -> dict[str, Any]:
    loop = asyncio.get_event_loop()
    percent = await loop.run_in_executor(None, lambda: psutil.cpu_percent(interval=0.5))
    freq = psutil.cpu_freq()
    return {
        "percent": percent,
        "count_logical": psutil.cpu_count(logical=True),
        "count_physical": psutil.cpu_count(logical=False),
        "frequency_mhz": round(freq.current, 2) if freq else None,
        "frequency_max_mhz": round(freq.max, 2) if freq else None,
        "per_cpu_percent": psutil.cpu_percent(percpu=True),
    }


async def get_memory_info() -> dict[str, Any]:
    vm = psutil.virtual_memory()
    swap = psutil.swap_memory()
    return {
        "total": vm.total,
        "available": vm.available,
        "used": vm.used,
        "free": vm.free,
        "percent": vm.percent,
        "swap_total": swap.total,
        "swap_used": swap.used,
        "swap_free": swap.free,
        "swap_percent": swap.percent,
    }


async def get_disk_info() -> list[dict[str, Any]]:
    partitions = psutil.disk_partitions(all=False)
    result = []
    for p in partitions:
        try:
            usage = psutil.disk_usage(p.mountpoint)
            result.append(
                {
                    "device": p.device,
                    "mountpoint": p.mountpoint,
                    "fstype": p.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": usage.percent,
                }
            )
        except (PermissionError, OSError):
            continue
    return result


async def get_network_info() -> dict[str, Any]:
    io = psutil.net_io_counters()
    interfaces = {}
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    for name, addr_list in addrs.items():
        iface_stats = stats.get(name)
        interfaces[name] = {
            "addresses": [
                {"family": str(a.family), "address": a.address, "netmask": a.netmask}
                for a in addr_list
            ],
            "is_up": iface_stats.isup if iface_stats else False,
            "speed_mbps": iface_stats.speed if iface_stats else 0,
        }
    return {
        "bytes_sent": io.bytes_sent,
        "bytes_recv": io.bytes_recv,
        "packets_sent": io.packets_sent,
        "packets_recv": io.packets_recv,
        "errin": io.errin,
        "errout": io.errout,
        "dropin": io.dropin,
        "dropout": io.dropout,
        "interfaces": interfaces,
    }


async def get_temperature_info() -> Optional[dict[str, Any]]:
    try:
        temps = psutil.sensors_temperatures()
        if not temps:
            return None
        result = {}
        for name, entries in temps.items():
            result[name] = [
                {
                    "label": e.label or name,
                    "current": e.current,
                    "high": e.high,
                    "critical": e.critical,
                }
                for e in entries
            ]
        return result
    except (AttributeError, Exception):
        return None


async def get_system_summary() -> dict[str, Any]:
    cpu, memory, disk, network = await asyncio.gather(
        get_cpu_info(),
        get_memory_info(),
        get_disk_info(),
        get_network_info(),
    )
    temperature = await get_temperature_info()
    return {
        "timestamp": time.time(),
        "cpu": cpu,
        "memory": memory,
        "disk": disk,
        "network": network,
        "temperature": temperature,
    }


async def get_uptime() -> dict[str, Any]:
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    days, remainder = divmod(int(uptime_seconds), 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)
    return {
        "boot_time": boot_time,
        "uptime_seconds": uptime_seconds,
        "uptime_human": f"{days}d {hours}h {minutes}m {seconds}s",
    }
