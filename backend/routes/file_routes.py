import os
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from auth.auth_routes import get_current_user
from services import file_manager

router = APIRouter(prefix="/files", tags=["files"])


class WriteFileRequest(BaseModel):
    path: str
    content: str
    create_dirs: bool = False


class RenameRequest(BaseModel):
    src: str
    dst: str


class CopyRequest(BaseModel):
    src: str
    dst: str


class CreateDirRequest(BaseModel):
    path: str


@router.get("/list")
async def list_directory(
    path: str = Query("/", description="Directory path to list"),
    show_hidden: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    try:
        return file_manager.list_directory(path, show_hidden=show_hidden)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except NotADirectoryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/read")
async def read_file(
    path: str = Query(..., description="File path to read"),
    current_user: dict = Depends(get_current_user),
):
    try:
        return file_manager.read_file(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (IsADirectoryError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/write")
async def write_file(
    body: WriteFileRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        return file_manager.write_file(body.path, body.content, create_dirs=body.create_dirs)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except OSError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/mkdir")
async def create_directory(
    body: CreateDirRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        return file_manager.create_directory(body.path)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except OSError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/delete")
async def delete_path(
    path: str = Query(..., description="Path to delete"),
    current_user: dict = Depends(get_current_user),
):
    try:
        return file_manager.delete_path(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except OSError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/rename")
async def rename_path(
    body: RenameRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        return file_manager.rename_path(body.src, body.dst)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except OSError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/copy")
async def copy_path(
    body: CopyRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        return file_manager.copy_path(body.src, body.dst)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except OSError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/search")
async def search_files(
    base_path: str = Query("/", description="Base directory to search in"),
    query: str = Query(..., description="Search term"),
    max_results: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    try:
        return {"results": file_manager.search_files(base_path, query, max_results=max_results)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/metadata")
async def file_metadata(
    path: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        return file_manager.get_file_metadata(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/upload")
async def upload_file(
    destination_dir: str = Query(..., description="Directory to upload file into"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    dest_dir = Path(destination_dir)
    if not dest_dir.exists() or not dest_dir.is_dir():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Destination directory does not exist")
    safe_filename = Path(file.filename).name
    dest_path = dest_dir / safe_filename
    try:
        async with aiofiles.open(dest_path, "wb") as out:
            while chunk := await file.read(65536):
                await out.write(chunk)
        return {"uploaded": True, "path": str(dest_path), "filename": safe_filename}
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except OSError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/download")
async def download_file(
    path: str = Query(..., description="File path to download"),
    current_user: dict = Depends(get_current_user),
):
    target = Path(path).resolve()
    if not target.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    if not target.is_file():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Path is not a file")
    return FileResponse(path=str(target), filename=target.name)
