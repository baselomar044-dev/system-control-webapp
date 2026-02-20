import mimetypes
import os
import shutil
import time
from pathlib import Path
from typing import Any, Optional


def _safe_path(base: str, user_path: str) -> Path:
    base_path = Path(base).resolve()
    target = (base_path / user_path.lstrip("/")).resolve()
    if not str(target).startswith(str(base_path)):
        raise PermissionError(f"Path traversal attempt detected: {user_path}")
    return target


def list_directory(path: str, show_hidden: bool = False) -> dict[str, Any]:
    target = Path(path).resolve()
    if not target.exists():
        raise FileNotFoundError(f"Path does not exist: {path}")
    if not target.is_dir():
        raise NotADirectoryError(f"Not a directory: {path}")

    entries = []
    try:
        for item in sorted(target.iterdir(), key=lambda x: (x.is_file(), x.name.lower())):
            if not show_hidden and item.name.startswith("."):
                continue
            try:
                stat = item.stat()
                entries.append(
                    {
                        "name": item.name,
                        "path": str(item),
                        "is_dir": item.is_dir(),
                        "is_file": item.is_file(),
                        "size": stat.st_size if item.is_file() else None,
                        "modified": stat.st_mtime,
                        "created": stat.st_ctime,
                        "permissions": oct(stat.st_mode)[-3:],
                        "mime_type": mimetypes.guess_type(item.name)[0] if item.is_file() else None,
                    }
                )
            except (PermissionError, OSError):
                continue
    except PermissionError as e:
        raise PermissionError(f"Cannot list directory: {e}")

    parent = str(target.parent) if str(target) != str(target.parent) else None
    return {
        "path": str(target),
        "parent": parent,
        "entries": entries,
        "total": len(entries),
    }


def read_file(path: str, max_size_bytes: int = 10 * 1024 * 1024) -> dict[str, Any]:
    target = Path(path).resolve()
    if not target.exists():
        raise FileNotFoundError(f"File does not exist: {path}")
    if not target.is_file():
        raise IsADirectoryError(f"Path is a directory: {path}")
    size = target.stat().st_size
    if size > max_size_bytes:
        raise ValueError(f"File too large to read: {size} bytes (max {max_size_bytes})")
    mime, _ = mimetypes.guess_type(target.name)
    is_text = mime is None or mime.startswith("text/") or mime in (
        "application/json", "application/xml", "application/javascript",
        "application/x-sh", "application/x-yaml",
    )
    if is_text:
        try:
            content = target.read_text(encoding="utf-8", errors="replace")
            return {"path": str(target), "content": content, "encoding": "utf-8", "size": size, "mime_type": mime}
        except Exception:
            pass
    content_bytes = target.read_bytes()
    return {
        "path": str(target),
        "content": content_bytes.hex(),
        "encoding": "hex",
        "size": size,
        "mime_type": mime,
    }


def write_file(path: str, content: str, create_dirs: bool = False) -> dict[str, Any]:
    target = Path(path).resolve()
    if create_dirs:
        target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return {"path": str(target), "size": target.stat().st_size, "written": True}


def create_directory(path: str) -> dict[str, Any]:
    target = Path(path).resolve()
    target.mkdir(parents=True, exist_ok=True)
    return {"path": str(target), "created": True}


def delete_path(path: str) -> dict[str, Any]:
    target = Path(path).resolve()
    if not target.exists():
        raise FileNotFoundError(f"Path does not exist: {path}")
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return {"path": str(target), "deleted": True}


def rename_path(src: str, dst: str) -> dict[str, Any]:
    source = Path(src).resolve()
    destination = Path(dst).resolve()
    if not source.exists():
        raise FileNotFoundError(f"Source does not exist: {src}")
    source.rename(destination)
    return {"src": str(source), "dst": str(destination), "renamed": True}


def copy_path(src: str, dst: str) -> dict[str, Any]:
    source = Path(src).resolve()
    destination = Path(dst).resolve()
    if not source.exists():
        raise FileNotFoundError(f"Source does not exist: {src}")
    if source.is_dir():
        shutil.copytree(source, destination)
    else:
        shutil.copy2(source, destination)
    return {"src": str(source), "dst": str(destination), "copied": True}


def search_files(base_path: str, query: str, max_results: int = 100) -> list[dict[str, Any]]:
    base = Path(base_path).resolve()
    if not base.exists():
        raise FileNotFoundError(f"Base path does not exist: {base_path}")
    results = []
    query_lower = query.lower()
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for name in files:
            if query_lower in name.lower():
                full_path = Path(root) / name
                try:
                    stat = full_path.stat()
                    results.append({
                        "name": name,
                        "path": str(full_path),
                        "size": stat.st_size,
                        "modified": stat.st_mtime,
                    })
                except OSError:
                    continue
            if len(results) >= max_results:
                return results
    return results


def get_file_metadata(path: str) -> dict[str, Any]:
    target = Path(path).resolve()
    if not target.exists():
        raise FileNotFoundError(f"Path does not exist: {path}")
    stat = target.stat()
    mime, _ = mimetypes.guess_type(target.name)
    return {
        "name": target.name,
        "path": str(target),
        "is_dir": target.is_dir(),
        "is_file": target.is_file(),
        "size": stat.st_size,
        "modified": stat.st_mtime,
        "created": stat.st_ctime,
        "permissions": oct(stat.st_mode)[-3:],
        "mime_type": mime,
        "suffix": target.suffix,
        "parent": str(target.parent),
    }
