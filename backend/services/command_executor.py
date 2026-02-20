import asyncio
import json
import os
import time
from typing import Any

from config import COMMAND_HISTORY_FILE

BLACKLISTED_PATTERNS = [
    "rm -rf /",
    "rm -rf /*",
    "mkfs",
    "dd if=/dev/zero",
    "dd if=/dev/random",
    ":(){:|:&};:",
    "chmod -R 777 /",
    "chown -R",
    "format c:",
    "deltree",
    "> /dev/sda",
    "shred /dev/",
]


def _is_dangerous(command: str) -> bool:
    cmd_lower = command.lower().strip()
    for pattern in BLACKLISTED_PATTERNS:
        if pattern.lower() in cmd_lower:
            return True
    return False


def _load_history() -> list[dict[str, Any]]:
    if not os.path.exists(COMMAND_HISTORY_FILE):
        return []
    try:
        with open(COMMAND_HISTORY_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save_history(history: list[dict[str, Any]]) -> None:
    try:
        with open(COMMAND_HISTORY_FILE, "w") as f:
            json.dump(history[-500:], f, indent=2)
    except OSError:
        pass


def get_history(limit: int = 50) -> list[dict[str, Any]]:
    history = _load_history()
    return history[-limit:]


def clear_history() -> dict[str, Any]:
    _save_history([])
    return {"cleared": True}


async def execute_command(
    command: str,
    timeout: int = 30,
    working_dir: str | None = None,
) -> dict[str, Any]:
    if _is_dangerous(command):
        return {
            "command": command,
            "stdout": "",
            "stderr": "Command blocked: dangerous operation detected",
            "return_code": -1,
            "blocked": True,
            "duration": 0,
            "timestamp": time.time(),
        }

    start = time.time()
    try:
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=working_dir,
        )
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=timeout
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.communicate()
            duration = time.time() - start
            result = {
                "command": command,
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
                "return_code": -1,
                "blocked": False,
                "timed_out": True,
                "duration": duration,
                "timestamp": time.time(),
            }
            _append_history(result)
            return result

        duration = time.time() - start
        result = {
            "command": command,
            "stdout": stdout_bytes.decode("utf-8", errors="replace"),
            "stderr": stderr_bytes.decode("utf-8", errors="replace"),
            "return_code": process.returncode,
            "blocked": False,
            "timed_out": False,
            "duration": round(duration, 3),
            "timestamp": time.time(),
        }
    except Exception as e:
        duration = time.time() - start
        result = {
            "command": command,
            "stdout": "",
            "stderr": str(e),
            "return_code": -1,
            "blocked": False,
            "timed_out": False,
            "duration": round(duration, 3),
            "timestamp": time.time(),
        }

    _append_history(result)
    return result


def _append_history(entry: dict[str, Any]) -> None:
    history = _load_history()
    history.append(entry)
    _save_history(history)
