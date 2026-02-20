import platform
import subprocess
from typing import Any


def _get_platform() -> str:
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    if system == "windows":
        return "windows"
    return "linux"


def _run(cmd: list[str]) -> dict[str, Any]:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return {"success": result.returncode == 0, "output": result.stdout, "error": result.stderr}
    except FileNotFoundError as e:
        return {"success": False, "output": "", "error": f"Command not found: {e}"}
    except subprocess.TimeoutExpired:
        return {"success": False, "output": "", "error": "Command timed out"}
    except Exception as e:
        return {"success": False, "output": "", "error": str(e)}


def shutdown(delay_seconds: int = 0) -> dict[str, Any]:
    os_name = _get_platform()
    if os_name == "windows":
        cmd = ["shutdown", "/s", "/t", str(delay_seconds)]
    elif os_name == "macos":
        delay_mins = delay_seconds // 60
        cmd = ["sudo", "shutdown", "-h", "now" if delay_mins == 0 else f"+{delay_mins}"]
    else:
        delay_mins = delay_seconds // 60
        cmd = ["sudo", "shutdown", "-h", "now" if delay_mins == 0 else f"+{delay_mins}"]
    return {**_run(cmd), "action": "shutdown", "platform": os_name}


def restart(delay_seconds: int = 0) -> dict[str, Any]:
    os_name = _get_platform()
    if os_name == "windows":
        cmd = ["shutdown", "/r", "/t", str(delay_seconds)]
    elif os_name == "macos":
        delay_mins = delay_seconds // 60
        cmd = ["sudo", "shutdown", "-r", "now" if delay_mins == 0 else f"+{delay_mins}"]
    else:
        delay_mins = delay_seconds // 60
        cmd = ["sudo", "shutdown", "-r", "now" if delay_mins == 0 else f"+{delay_mins}"]
    return {**_run(cmd), "action": "restart", "platform": os_name}


def sleep_system() -> dict[str, Any]:
    os_name = _get_platform()
    if os_name == "windows":
        cmd = ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"]
    elif os_name == "macos":
        cmd = ["pmset", "sleepnow"]
    else:
        cmd = ["systemctl", "suspend"]
    return {**_run(cmd), "action": "sleep", "platform": os_name}


def lock_screen() -> dict[str, Any]:
    os_name = _get_platform()
    if os_name == "windows":
        cmd = ["rundll32.exe", "user32.dll,LockWorkStation"]
    elif os_name == "macos":
        cmd = [
            "osascript",
            "-e",
            'tell application "System Events" to keystroke "q" using {command down, control down}',
        ]
    else:
        for locker in ("gnome-screensaver-command", "xdg-screensaver", "loginctl"):
            if locker == "gnome-screensaver-command":
                result = _run([locker, "--lock"])
            elif locker == "xdg-screensaver":
                result = _run([locker, "lock"])
            else:
                result = _run([locker, "lock-session"])
            if result["success"]:
                return {**result, "action": "lock", "platform": os_name}
        return {"success": False, "output": "", "error": "No screen locker found", "action": "lock", "platform": os_name}
    return {**_run(cmd), "action": "lock", "platform": os_name}


def cancel_shutdown() -> dict[str, Any]:
    os_name = _get_platform()
    if os_name == "windows":
        cmd = ["shutdown", "/a"]
    else:
        cmd = ["sudo", "shutdown", "-c"]
    return {**_run(cmd), "action": "cancel_shutdown", "platform": os_name}
