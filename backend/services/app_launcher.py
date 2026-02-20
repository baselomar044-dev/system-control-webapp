import os
import platform
import shutil
import subprocess
from typing import Any


def _get_platform() -> str:
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    if system == "windows":
        return "windows"
    return "linux"


def _linux_applications() -> list[dict[str, Any]]:
    apps = []
    desktop_dirs = [
        "/usr/share/applications",
        "/usr/local/share/applications",
        os.path.expanduser("~/.local/share/applications"),
    ]
    for directory in desktop_dirs:
        if not os.path.isdir(directory):
            continue
        for filename in os.listdir(directory):
            if not filename.endswith(".desktop"):
                continue
            filepath = os.path.join(directory, filename)
            try:
                name = None
                exec_cmd = None
                no_display = False
                with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("Name=") and name is None:
                            name = line[5:]
                        elif line.startswith("Exec=") and exec_cmd is None:
                            exec_cmd = line[5:].split()[0]
                        elif line == "NoDisplay=true":
                            no_display = True
                if name and exec_cmd and not no_display:
                    apps.append({
                        "name": name,
                        "exec": exec_cmd,
                        "desktop_file": filepath,
                        "platform": "linux",
                    })
            except OSError:
                continue
    return apps


def _macos_applications() -> list[dict[str, Any]]:
    apps = []
    app_dirs = ["/Applications", os.path.expanduser("~/Applications")]
    for directory in app_dirs:
        if not os.path.isdir(directory):
            continue
        for item in os.listdir(directory):
            if item.endswith(".app"):
                apps.append({
                    "name": item[:-4],
                    "exec": os.path.join(directory, item),
                    "platform": "macos",
                })
    return apps


def _windows_applications() -> list[dict[str, Any]]:
    common_paths = [
        r"C:\Program Files",
        r"C:\Program Files (x86)",
        os.path.expanduser(r"~\AppData\Local\Programs"),
    ]
    apps = []
    for base in common_paths:
        if not os.path.isdir(base):
            continue
        for item in os.listdir(base):
            full_path = os.path.join(base, item)
            if os.path.isdir(full_path):
                apps.append({"name": item, "exec": full_path, "platform": "windows"})
    return apps


def list_applications() -> list[dict[str, Any]]:
    os_name = _get_platform()
    if os_name == "linux":
        return _linux_applications()
    if os_name == "macos":
        return _macos_applications()
    return _windows_applications()


def launch_application(app_name_or_exec: str) -> dict[str, Any]:
    os_name = _get_platform()
    try:
        if os_name == "linux":
            if os.path.isfile(app_name_or_exec) and app_name_or_exec.endswith(".desktop"):
                proc = subprocess.Popen(["gtk-launch", os.path.basename(app_name_or_exec)])
            else:
                proc = subprocess.Popen([app_name_or_exec], start_new_session=True)
        elif os_name == "macos":
            proc = subprocess.Popen(["open", app_name_or_exec])
        else:
            proc = subprocess.Popen([app_name_or_exec], creationflags=subprocess.DETACHED_PROCESS)
        return {"launched": True, "pid": proc.pid, "app": app_name_or_exec}
    except FileNotFoundError:
        return {"launched": False, "error": f"Application not found: {app_name_or_exec}"}
    except Exception as e:
        return {"launched": False, "error": str(e)}


def close_application(process_name: str) -> dict[str, Any]:
    os_name = _get_platform()
    try:
        if os_name == "windows":
            result = subprocess.run(
                ["taskkill", "/F", "/IM", process_name],
                capture_output=True, text=True
            )
        else:
            result = subprocess.run(
                ["pkill", "-f", process_name],
                capture_output=True, text=True
            )
        return {
            "closed": result.returncode == 0,
            "process": process_name,
            "output": result.stdout,
            "error": result.stderr,
        }
    except Exception as e:
        return {"closed": False, "process": process_name, "error": str(e)}
