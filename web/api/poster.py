import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter()


ASSET_DIR = "web/static/assets"


def get_logger(request: Request) -> Any:
    return request.app.state.logger


@router.post("/api/poster-search-stats")
async def poster_search_stats(request: Request, logger: Any = Depends(get_logger)):
    """Returns stats and file list for a given poster location directory."""
    try:
        data = await request.json()
        location = data.get("location")
        logger.debug(
            f"[WEB] Serving POST /api/poster-search-stats for location: {location}"
        )
        if not location or not os.path.isdir(location):
            return JSONResponse(status_code=400, content={"error": "Invalid location"})
        total_size = 0
        poster_files = []
        for root, dirs, files in os.walk(location):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    stat = os.stat(fp)
                    total_size += stat.st_size
                    rel_path = os.path.relpath(fp, location)
                    if rel_path.startswith("tmp" + os.sep) or rel_path.startswith(
                        "tmp/"
                    ):
                        continue
                    poster_files.append(rel_path)
                except Exception as e:
                    logger.error(f"SKIPPED FILE: {fp} | ERROR: {e}")
                    continue
        return {
            "file_count": len(poster_files),
            "size_bytes": total_size,
            "files": sorted(poster_files),
        }
    except Exception as e:
        logger.error(f"poster-search-stats error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/api/preview-poster")
async def preview_poster(location: str, path: str, logger: Any = Depends(get_logger)):
    """
    Returns the requested poster image file as a response if it exists within location.
    """
    try:
        base_dir = Path(location).resolve()
        file_path = (base_dir / path).resolve()
        # Security: prevent path traversal
        if not str(file_path).startswith(str(base_dir)):
            return JSONResponse(status_code=403, content={"error": "Invalid path"})
        if not file_path.exists() or not file_path.is_file():
            return JSONResponse(status_code=404, content={"error": "File not found"})
        # Basic file type check (optional: just for images)
        if file_path.suffix.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            return JSONResponse(
                status_code=415, content={"error": "Unsupported file type"}
            )
        logger.debug(f"[WEB] Serving image preview: {file_path}")
        return FileResponse(str(file_path))
    except Exception as e:
        logger.error(f"[WEB] Preview poster error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/api/poster_assets")
def list_poster_assets():
    # Only include image files (update extensions if needed)
    allowed_ext = {".jpg", ".jpeg", ".png", ".webp"}
    try:
        files = [
            f
            for f in os.listdir(ASSET_DIR)
            if os.path.isfile(os.path.join(ASSET_DIR, f))
            and os.path.splitext(f)[1].lower() in allowed_ext
        ]
        return JSONResponse(files)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
