import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    JSONResponse,
    PlainTextResponse,
)
from fastapi.staticfiles import StaticFiles

from api import (
    config as config_router,
    instances as plex_router,
    jobs as job_router,
    logs as logs_router,
    modules as modules_router,
    notifications as notifications_router,
    poster as poster_search_router,
)
from util.database import DapsDB
from util.database.worker import process_job
from util.version import get_version


@asynccontextmanager
async def lifespan(app):
    app.state.logger = app.state.logger
    app.state.db = DapsDB(logger=app.state.logger)

    app.state.db.adhoc_worker = app.state.db.create_worker(
        num_workers=3, worker_name="ADHOC", job_type_filter="webhook"
    )
    app.state.db.background_worker = app.state.db.create_worker(
        num_workers=3, worker_name="BACKGROUND", job_type_filter=None
    )

    app.state.db.adhoc_worker.start(
        table_name="jobs",
        process_fn=lambda job: process_job(
            job, app.state.logger, worker=app.state.db.adhoc_worker
        ),
        job_type_filter="webhook",
    )
    app.state.db.background_worker.start(
        table_name="jobs",
        process_fn=lambda job: process_job(
            job, app.state.logger, worker=app.state.db.background_worker
        ),
        job_type_filter=None,
    )

    yield

    app.state.db.adhoc_worker.stop()
    app.state.db.background_worker.stop()
    app.state.db.close_all()


app = FastAPI(lifespan=lifespan)
router = APIRouter()

# Mount the built assets directory
app.mount(
    "/assets",
    StaticFiles(directory=Path(__file__).parents[1] / "templates" / "assets"),
    name="assets",
)
app.mount(
    "/icons",
    StaticFiles(directory=Path(__file__).parents[1] / "templates" / "icons"),
    name="icons",
)
app.mount(
    "/img",
    StaticFiles(directory=Path(__file__).parents[1] / "templates" / "img"),
    name="img",
)


def get_logger(request: Request, source="WEB") -> Any:
    return request.app.state.logger.get_adapter(source)


@app.exception_handler(Exception)
async def handle_exception(exc: Exception, logger: Any = Depends(get_logger)):
    logger.error(f"Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": str(exc)})


app.include_router(config_router.router)
app.include_router(logs_router.router)
app.include_router(modules_router.router)
app.include_router(plex_router.router)
app.include_router(notifications_router.router)
app.include_router(poster_search_router.router)
app.include_router(job_router.router)
app.include_router(router)


@app.get("/api/version")
async def get_version_route(logger: Any = Depends(get_logger)):
    try:
        version = get_version()
        logger.debug(f"Serving GET /api/version: {version}")
    except Exception:
        version = "unknown"
    return PlainTextResponse(version)


@app.get("/api/list")
async def list_dir(path: str = "/", logger: Any = Depends(get_logger)):
    resolved = Path(path).expanduser().resolve()
    if not resolved.exists() or not resolved.is_dir():
        return JSONResponse(
            status_code=400,
            content={
                "directories": [],
                "exists": False,
                "writable": False,
                "error": "Invalid path",
            },
        )
    dirs = [
        p.name for p in resolved.iterdir() if p.is_dir() and not p.name.startswith(".")
    ]
    dirs.sort()
    return {
        "directories": dirs,
        "exists": True,
        "writable": os.access(resolved, os.W_OK),
    }


@app.post("/api/create-folder")
async def create_folder(path: str, logger: Any = Depends(get_logger)):
    resolved = Path(path).expanduser().resolve()
    try:
        logger.info(f"Creating folder: {resolved}")
        resolved.mkdir(parents=True, exist_ok=False)
        return {"status": "created"}
    except Exception as e:
        logger.error(f"Error creating folder {resolved}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/test-endpoint")
async def test_endpoint(request: Request, logger: Any = Depends(get_logger)):
    logger.debug("Serving POST /api/test-endpoint")
    try:
        data = await request.json()
        logger.debug(f"Received data: {data}")
        return {"status": "ok", "received": data}
    except Exception as e:
        logger.error(f"Error reading data: {e}")
        return {"status": "error", "error": str(e)}


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serves the main index.html page."""
    html_path = Path(__file__).parents[1] / "templates" / "index.html"
    try:
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(full_path: str):
    # Serve index.html for all non-API, non-assets routes (for SPA)
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail="Not Found")
    index_path = Path(__file__).parents[1] / "templates" / "index.html"
    return FileResponse(index_path)
