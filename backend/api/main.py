import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    JSONResponse,
)
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.api import (
    config as config_router,
    instances as instances_router,
    jobs as jobs_router,
    labelarr as labelarr_router,
    logs as logs_router,
    media as media_router,
    modules as modules_router,
    notifications as notifications_router,
    posters as posters_router,
    schedule as schedule_router,
    system as system_router,
    webhooks as webhooks_router,
)
from backend.api.utils import error, get_logger
from backend.util.database import DapsDB
from backend.util.job_processor import process_job

# Version functionality now in system.py


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI lifespan context manager with proper startup/shutdown"""

    logger = app.state.logger
    log = logger.get_adapter("FASTAPI") if logger else None

    try:
        if log:
            log.debug("Starting FastAPI application...")

        # CREATE SHARED DATABASE INSTANCE FOR ALL API ENDPOINTS
        try:
            app.state.db = DapsDB(
                logger=logger, quiet=False
            )  # Temporarily remove quiet for debugging
            app.state.db.__enter__()  # Initialize the context manually

            # UPDATE MODULE ORCHESTRATOR TO USE SHARED DATABASE
            if (
                hasattr(app.state, "module_orchestrator")
                and app.state.module_orchestrator
            ):
                app.state.module_orchestrator.db = app.state.db
        except Exception as e:
            if log:
                log.error(f"Failed to create shared database: {e}")
            raise

        if log:
            log.debug("Creating database workers...")

        # Use the shared database instance for workers
        app.state.webhook_worker = app.state.db.create_worker(
            logger=logger,
            num_workers=2,
            poll_interval=1,
            worker_name="WEBHOOK",
            job_type_filter="webhook_process",
        )

        app.state.background_worker = app.state.db.create_worker(
            logger=logger,
            num_workers=3,
            poll_interval=2,
            worker_name="BACKGROUND",
            job_type_filter=None,
        )

        if log:
            log.debug("Starting database workers...")

        # Create wrapper function that passes shared database context
        def shared_db_process_job(job, logger):
            """Wrapper that passes shared database context to process_job"""
            return process_job(job, logger, app.state.db)

        # FIXED: Use wrapper function that passes shared database context
        app.state.webhook_worker.start(
            table_name="jobs",
            process_fn=shared_db_process_job,
            job_type_filter="webhook_process",
        )

        app.state.background_worker.start(
            table_name="jobs", process_fn=shared_db_process_job, job_type_filter=None
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

            def stop_worker_with_timeout(
                name: str, worker: Any, timeout: int = 8
            ) -> None:
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

            # CLEANUP SHARED DATABASE
            if hasattr(app.state, "db") and app.state.db:
                try:
                    app.state.db.__exit__(None, None, None)  # Cleanup manually
                    if log:
                        log.debug("Shared database closed successfully")
                except Exception as e:
                    if log:
                        log.error(f"Error closing shared database: {e}")

            if log:
                log.info("FastAPI application shutdown complete")

        except Exception as e:
            if log:
                log.error(f"Error during FastAPI shutdown: {e}", exc_info=True)


app = FastAPI(
    title="DAPS API",
    description="Dynamic Asset and Poster System - Media automation and poster management API",
    version="3.0.0-alpha",
    lifespan=lifespan,
    tags_metadata=[
        {"name": "System", "description": "System-level operations and utilities"},
        {
            "name": "Configuration",
            "description": "Application configuration management",
        },
        {
            "name": "Service Instances",
            "description": "Plex, Radarr, and Sonarr instance management",
        },
        {
            "name": "Schedule Management",
            "description": "Module scheduling configuration",
        },
        {"name": "Jobs", "description": "Background job queue management"},
        {"name": "Modules", "description": "Module execution and orchestration"},
        {"name": "Logs", "description": "Log file access and management"},
        {"name": "Media Cache", "description": "Media cache operations and management"},
        {"name": "Posters", "description": "Poster management and statistics"},
        {"name": "Webhooks", "description": "Webhook processing and automation"},
        {"name": "Notifications", "description": "Notification testing and management"},
        {"name": "Labelarr", "description": "Tag synchronization between ARR and Plex"},
    ],
)
router = APIRouter()

# Mount static directories - all served from templates after build
app.mount(
    "/assets",
    StaticFiles(directory=Path(__file__).parents[2] / "templates" / "assets"),
    name="assets",
)
app.mount(
    "/icons",
    StaticFiles(directory=Path(__file__).parents[2] / "templates" / "icons"),
    name="icons",
)
app.mount(
    "/img",
    StaticFiles(directory=Path(__file__).parents[2] / "templates" / "img"),
    name="img",
)
app.mount(
    "/posters",
    StaticFiles(directory=Path(__file__).parents[2] / "templates" / "posters"),
    name="posters",
)


@app.exception_handler(Exception)
async def handle_exception(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all exception handler with standardized payload."""
    logger = get_logger(request, "ERROR")
    logger.error(f"Unhandled Exception: {exc}", exc_info=True)
    return error(
        f"Internal server error: {str(exc)}", code="INTERNAL_ERROR", status_code=500
    )


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Standardize HTTPException responses into the common error envelope."""
    logger = get_logger(request, "ERROR")
    logger.warning(f"HTTP {exc.status_code}: {exc.detail}")

    detail = exc.detail
    if isinstance(detail, dict):
        msg = detail.get("message") or str(detail)
        code = detail.get("error_code") or "HTTP_ERROR"
        data = detail.get("data")
    else:
        msg = str(detail)
        code = "HTTP_ERROR"
        data = None

    return error(msg, code=code, data=data, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def handle_validation_exception(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return a normalized 422 for validation errors."""
    logger = get_logger(request, "ERROR")
    logger.warning(f"Validation error: {exc.errors()}")
    return error(
        "Validation error", code="VALIDATION_ERROR", data=exc.errors(), status_code=422
    )


# Register API routers with proper organization
app.include_router(system_router.router)
app.include_router(config_router.router)
app.include_router(instances_router.router)
app.include_router(schedule_router.router)
app.include_router(jobs_router.router)
app.include_router(modules_router.router)
app.include_router(logs_router.router)
app.include_router(media_router.router)
app.include_router(posters_router.router)
app.include_router(webhooks_router.router)
app.include_router(notifications_router.router)
app.include_router(labelarr_router.router)
app.include_router(router)


# Generic endpoints moved to system.py router


@app.get("/", response_class=HTMLResponse)
async def root() -> HTMLResponse:
    """Serves the main index.html page."""
    html_path = Path(__file__).parents[2] / "templates" / "index.html"
    try:
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    except Exception as e:
        return error(
            f"Error serving index page: {str(e)}",
            code="INDEX_PAGE_ERROR",
            status_code=500,
        )


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(full_path: str) -> FileResponse:
    """Serve index.html for all non-API, non-assets routes (for SPA)"""
    # Exclude API and static asset paths
    if (
        full_path.startswith("api/")
        or full_path == "api"
        or full_path.startswith("assets/")
        or full_path.startswith("icons/")
        or full_path.startswith("img/")
        or full_path.startswith("posters/")
    ):
        raise HTTPException(status_code=404, detail="Resource not found")

    index_path = Path(__file__).parents[2] / "templates" / "index.html"
    return FileResponse(index_path)
