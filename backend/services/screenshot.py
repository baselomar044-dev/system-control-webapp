import base64
import os
import time
from pathlib import Path
from typing import Any

from config import SCREENSHOT_DIR

try:
    from PIL import ImageGrab, Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


def _ensure_dir() -> Path:
    path = Path(SCREENSHOT_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def take_screenshot(save_to_disk: bool = True) -> dict[str, Any]:
    if not PIL_AVAILABLE:
        return {"success": False, "error": "Pillow is not installed", "base64": None, "path": None}

    try:
        screenshot = ImageGrab.grab()
    except Exception as e:
        try:
            import subprocess
            from PIL import Image
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp_path = tmp.name
            subprocess.run(["scrot", tmp_path], check=True, timeout=10)
            screenshot = Image.open(tmp_path)
            os.unlink(tmp_path)
        except Exception:
            return {"success": False, "error": str(e), "base64": None, "path": None}

    width, height = screenshot.size
    file_path = None

    if save_to_disk:
        dir_path = _ensure_dir()
        filename = f"screenshot_{int(time.time())}.png"
        file_path = str(dir_path / filename)
        screenshot.save(file_path, "PNG")

    import io
    buffer = io.BytesIO()
    screenshot.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "success": True,
        "base64": b64,
        "path": file_path,
        "width": width,
        "height": height,
        "timestamp": time.time(),
        "mime_type": "image/png",
    }


def list_screenshots() -> list[dict[str, Any]]:
    dir_path = _ensure_dir()
    results = []
    for item in sorted(dir_path.iterdir(), reverse=True):
        if item.suffix.lower() in (".png", ".jpg", ".jpeg"):
            try:
                stat = item.stat()
                results.append({
                    "filename": item.name,
                    "path": str(item),
                    "size": stat.st_size,
                    "created": stat.st_ctime,
                })
            except OSError:
                continue
    return results


def get_screenshot_as_base64(filename: str) -> dict[str, Any]:
    dir_path = _ensure_dir()
    safe_name = Path(filename).name
    file_path = dir_path / safe_name
    if not file_path.exists():
        return {"success": False, "error": "Screenshot not found", "base64": None}
    if not str(file_path.resolve()).startswith(str(dir_path.resolve())):
        return {"success": False, "error": "Invalid path", "base64": None}
    b64 = base64.b64encode(file_path.read_bytes()).decode("utf-8")
    mime = "image/jpeg" if safe_name.lower().endswith((".jpg", ".jpeg")) else "image/png"
    return {"success": True, "base64": b64, "filename": safe_name, "mime_type": mime}


def delete_screenshot(filename: str) -> dict[str, Any]:
    dir_path = _ensure_dir()
    safe_name = Path(filename).name
    file_path = dir_path / safe_name
    if not file_path.exists():
        return {"deleted": False, "error": "File not found"}
    if not str(file_path.resolve()).startswith(str(dir_path.resolve())):
        return {"deleted": False, "error": "Invalid path"}
    file_path.unlink()
    return {"deleted": True, "filename": safe_name}
