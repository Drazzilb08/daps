from typing import Any
from pathlib import Path
from fastapi import FastAPI, APIRouter, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from util.version import get_version

from web.api import config as config_router
from web.api import logs as logs_router
from web.api import modules as modules_router
from web.api import instances as plex_router
from web.api import notifications as notifications_router
from web.api import poster_search as poster_search_router

# ---- App Construction ----
app = FastAPI()
router = APIRouter()
app.state.logger = None

def get_logger(request: Request) -> Any:
    return request.app.state.logger

# ==== Exception Handling ====
@app.exception_handler(Exception)
async def handle_exception(request: Request, exc: Exception):
    logger = getattr(request.app.state, "logger", None)
    if logger:
        logger.error(f"[WEB] Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": str(exc)})

# ==== Mount API Routers ====
app.include_router(config_router.router)
app.include_router(logs_router.router)
app.include_router(modules_router.router)
app.include_router(plex_router.router)
app.include_router(notifications_router.router)
app.include_router(poster_search_router.router)
app.include_router(router)

# ==== Static and Templates ====
app.mount(
    "/web/static",
    StaticFiles(directory=Path(__file__).parent.parent / "static"),
    name="static",
)

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serves the main index.html page."""
    html_path = Path(__file__).parent / "templates" / "index.html"
    try:
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/pages/{fragment_name}", response_class=HTMLResponse)
async def serve_fragment(fragment_name: str, request: Request):
    """Serves a named HTML fragment from the fragments directory."""
    html_path = Path(__file__).parent / "templates" / "pages" / f"{fragment_name}.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="Fragment not found")
    try:
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    except Exception as e:
        logger = getattr(request.app.state, "logger", None)
        if logger:
            logger.error(f"[WEB] Error serving fragment {fragment_name}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# ==== Misc Utility Endpoints ====
@app.get("/api/version")
async def get_version_route(request: Request):
    logger = getattr(request.app.state, "logger", None)
    try:
        version = get_version()
        if logger:
            logger.debug(f"[WEB] Serving GET /api/version: {version}")
    except Exception:
        version = "unknown"
    return PlainTextResponse(version)

@app.get("/api/list")
async def list_dir(path: str = "/"):
    """Returns subdirectories for a given path."""
    resolved = Path(path).expanduser().resolve()
    if not resolved.exists() or not resolved.is_dir():
        return JSONResponse(status_code=400, content={"error": "Invalid path"})
    dirs = [
        p.name for p in resolved.iterdir() if p.is_dir() and not p.name.startswith(".")
    ]
    dirs.sort()
    return {"directories": dirs}

@app.post("/api/create-folder")
async def create_folder(path: str, request: Request):
    logger = getattr(request.app.state, "logger", None)
    resolved = Path(path).expanduser().resolve()
    try:
        if logger:
            logger.info(f"[WEB] Creating folder: {resolved}")
        resolved.mkdir(parents=True, exist_ok=False)
        return {"status": "created"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ==== Test and Misc (Optional: Remove/Refactor) ====
@app.post("/api/test-endpoint")
async def test_endpoint(request: Request):
    logger = getattr(request.app.state, "logger", None)
    if logger:
        logger.debug("[WEB] Serving POST /api/test-endpoint")
    try:
        data = await request.json()
        if logger:
            logger.debug(f"[WEB] Received data: {data}")
        return {"status": "ok", "received": data}
    except Exception as e:
        if logger:
            logger.error(f"[WEB] Error reading data: {e}")
        return {"status": "error", "error": str(e)}