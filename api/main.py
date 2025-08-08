import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    JSONResponse,
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
from util.job_processor import process_job
from util.version import get_version


@asynccontextmanager
async def lifespan(app):
    """FastAPI lifespan context manager with proper startup/shutdown"""

    logger = app.state.logger
    log = logger.get_adapter("FASTAPI") if logger else None

    try:
        if log:
            log.debug("Starting FastAPI application...")

        # FIXED: Use DapsDB context manager properly and simplify worker setup
        with DapsDB(logger=logger) as db:
            if log:
                log.debug("Creating database workers...")

            # SIMPLIFIED: Create workers with cleaner interface
            app.state.webhook_worker = db.create_worker(
                logger=logger,
                num_workers=2,
                poll_interval=1,
                worker_name="WEBHOOK",
                job_type_filter="webhook_process",
            )

            app.state.background_worker = db.create_worker(
                logger=logger,
                num_workers=3,
                poll_interval=2,
                worker_name="BACKGROUND",
                job_type_filter=None,
            )

            if log:
                log.debug("Starting database workers...")

            # FIXED: Use unified process_job function with consistent signature
            app.state.webhook_worker.start(
                table_name="jobs",
                process_fn=process_job,
                job_type_filter="webhook_process",
            )

            app.state.background_worker.start(
                table_name="jobs", process_fn=process_job, job_type_filter=None
            )

            if log:
                log.info("FastAPI application started successfully")

            yield

    except Exception as e:
        if log:
            log.error(f"Error during FastAPI startup: {e}", exc_info=True)
        else:
            print(f"[FASTAPI] Startup error: {e}")
        raise

    finally:
        if log:
            log.debug("Shutting down FastAPI application...")
        else:
            print("[FASTAPI] Shutting down...")

        try:
            # SIMPLIFIED: Cleaner shutdown
            workers_to_stop = []
            if hasattr(app.state, "webhook_worker") and app.state.webhook_worker:
                workers_to_stop.append(("webhook_worker", app.state.webhook_worker))
            if hasattr(app.state, "background_worker") and app.state.background_worker:
                workers_to_stop.append(
                    ("background_worker", app.state.background_worker)
                )

            def stop_worker_with_timeout(name, worker, timeout=8):
                try:
                    if log:
                        log.debug(f"Stopping {name}...")
                    worker.stop(timeout=timeout)
                    if log:
                        log.debug(f"{name} stopped successfully")
                except Exception as e:
                    if log:
                        log.error(f"Error stopping {name}: {e}")

            # Stop workers in parallel
            stop_threads = []
            for name, worker in workers_to_stop:
                thread = threading.Thread(
                    target=stop_worker_with_timeout, args=(name, worker, 8), daemon=True
                )
                thread.start()
                stop_threads.append(thread)

            # Wait for all to finish
            for thread in stop_threads:
                thread.join(timeout=10)

            if log:
                log.info("FastAPI application shutdown complete")

        except Exception as e:
            if log:
                log.error(f"Error during FastAPI shutdown: {e}", exc_info=True)


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
async def handle_exception(request: Request, exc: Exception):
    """FIXED: Standardized error response format"""
    logger = get_logger(request, "ERROR")
    logger.error(f"Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": f"Internal server error: {str(exc)}",
            "error_code": "INTERNAL_ERROR",
        },
    )


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
    """FIXED: Standardized response format"""
    try:
        version = get_version()
        logger.debug(f"Serving GET /api/version: {version}")
        return {
            "success": True,
            "message": "Version retrieved",
            "data": {"version": version},
        }
    except Exception as e:
        logger.error(f"Error getting version: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error getting version: {str(e)}",
                "error_code": "VERSION_ERROR",
            },
        )


@app.get("/api/list")
async def list_dir(path: str = "/", logger: Any = Depends(get_logger)):
    """FIXED: Standardized response format"""
    try:
        resolved = Path(path).expanduser().resolve()
        if not resolved.exists() or not resolved.is_dir():
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Invalid path",
                    "error_code": "INVALID_PATH",
                    "data": {"directories": [], "exists": False, "writable": False},
                },
            )

        dirs = [
            p.name
            for p in resolved.iterdir()
            if p.is_dir() and not p.name.startswith(".")
        ]
        dirs.sort()

        return {
            "success": True,
            "message": f"Listed {len(dirs)} directories",
            "data": {
                "directories": dirs,
                "exists": True,
                "writable": os.access(resolved, os.W_OK),
            },
        }
    except Exception as e:
        logger.error(f"Error listing directory {path}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error listing directory: {str(e)}",
                "error_code": "LIST_DIR_ERROR",
            },
        )


@app.post("/api/create-folder")
async def create_folder(path: str, logger: Any = Depends(get_logger)):
    """FIXED: Standardized response format"""
    try:
        resolved = Path(path).expanduser().resolve()
        logger.info(f"Creating folder: {resolved}")
        resolved.mkdir(parents=True, exist_ok=False)

        return {
            "success": True,
            "message": f"Folder created: {resolved}",
            "data": {"path": str(resolved)},
        }
    except Exception as e:
        logger.error(f"Error creating folder {path}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error creating folder: {str(e)}",
                "error_code": "CREATE_FOLDER_ERROR",
            },
        )


@app.post("/api/test-endpoint")
async def test_endpoint(request: Request, logger: Any = Depends(get_logger)):
    """FIXED: Standardized response format"""
    logger.debug("Serving POST /api/test-endpoint")
    try:
        data = await request.json()
        logger.debug(f"Received data: {data}")

        return {
            "success": True,
            "message": "Test endpoint working",
            "data": {"received": data},
        }
    except Exception as e:
        logger.error(f"Error reading data: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": f"Error reading request data: {str(e)}",
                "error_code": "REQUEST_DATA_ERROR",
            },
        )


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serves the main index.html page."""
    html_path = Path(__file__).parents[1] / "templates" / "index.html"
    try:
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error serving index page: {str(e)}",
                "error_code": "INDEX_PAGE_ERROR",
            },
        )


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(full_path: str):
    """Serve index.html for all non-API, non-assets routes (for SPA)"""
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail="API endpoint not found")

    index_path = Path(__file__).parents[1] / "templates" / "index.html"
    return FileResponse(index_path)
