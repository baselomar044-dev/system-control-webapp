from typing import Any, Optional

import psutil


def list_processes(sort_by: str = "cpu_percent", limit: int = 50) -> list[dict[str, Any]]:
    processes = []
    for proc in psutil.process_iter(
        ["pid", "name", "username", "cpu_percent", "memory_percent", "status", "create_time", "cmdline"]
    ):
        try:
            info = proc.info
            info["cmdline"] = " ".join(info.get("cmdline") or [])
            processes.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    valid_sorts = {"pid", "name", "cpu_percent", "memory_percent", "create_time", "status"}
    if sort_by not in valid_sorts:
        sort_by = "cpu_percent"

    processes.sort(key=lambda p: p.get(sort_by) or 0, reverse=sort_by in ("cpu_percent", "memory_percent"))
    return processes[:limit]


def get_process_details(pid: int) -> dict[str, Any]:
    try:
        proc = psutil.Process(pid)
        with proc.oneshot():
            return {
                "pid": proc.pid,
                "name": proc.name(),
                "status": proc.status(),
                "username": proc.username(),
                "cpu_percent": proc.cpu_percent(interval=0.1),
                "memory_info": proc.memory_info()._asdict(),
                "memory_percent": proc.memory_percent(),
                "create_time": proc.create_time(),
                "cmdline": " ".join(proc.cmdline()),
                "exe": proc.exe() if hasattr(proc, "exe") else None,
                "cwd": proc.cwd() if hasattr(proc, "cwd") else None,
                "num_threads": proc.num_threads(),
                "connections": [c._asdict() for c in proc.connections()],
                "open_files": [f.path for f in proc.open_files()],
            }
    except psutil.NoSuchProcess:
        raise ProcessLookupError(f"No process with PID {pid}")
    except psutil.AccessDenied:
        raise PermissionError(f"Access denied to process {pid}")


def kill_process(pid: int, force: bool = False) -> dict[str, Any]:
    try:
        proc = psutil.Process(pid)
        name = proc.name()
        if force:
            proc.kill()
        else:
            proc.terminate()
        return {"pid": pid, "name": name, "killed": True, "forced": force}
    except psutil.NoSuchProcess:
        raise ProcessLookupError(f"No process with PID {pid}")
    except psutil.AccessDenied:
        raise PermissionError(f"Access denied when trying to kill process {pid}")


def get_process_count() -> dict[str, int]:
    statuses: dict[str, int] = {}
    total = 0
    for proc in psutil.process_iter(["status"]):
        try:
            s = proc.info["status"]
            statuses[s] = statuses.get(s, 0) + 1
            total += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return {"total": total, **statuses}
