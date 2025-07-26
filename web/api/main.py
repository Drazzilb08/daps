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

from util.database import DapsDB
from util.database.worker import process_job
from util.version import get_version
from web.api import (
    config as config_router,
    instances as plex_router,
    logs as logs_router,
    modules as modules_router,
    notifications as notifications_router,
    poster as poster_search_router,
)


@asynccontextmanager
async def lifespan(app):

    app.state.logger = app.state.logger or None
    app.state.db = DapsDB(logger=app.state.logger)

    app.state.db.worker.start(
        table_name="jobs",
        process_fn=lambda job: process_job(job, app.state.logger),
    )
    yield
    app.state.db.worker.stop()
    app.state.db.close_all()


app = FastAPI(lifespan=lifespan)
router = APIRouter()
app.state.logger = None


def get_logger(request: Request, source="WEB") -> Any:
    return request.app.state.logger.get_adapter({"source": source})


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
app.include_router(router)


app.mount(
    "/web/static",
    StaticFiles(directory=Path(__file__).parents[1] / "static"),
    name="static",
)


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


@app.get("/api/unmatched")
async def get_unmatched(logger: Any = Depends(get_logger)):
    pass


@app.post("/api/run/unmatched")
async def run_unmatched(logger: Any = Depends(get_logger)):
    pass


@app.get("/api/cleanarr")
async def get_cleanarr(logger: Any = Depends(get_logger)):
    pass


@app.post("/api/run/cleanarr")
async def run_cleanarr(logger: Any = Depends(get_logger)):
    pass


@app.get("/api/page-fragment", response_class=HTMLResponse)
async def get_page_fragment(name: str, logger: Any = Depends(get_logger)):
    html_path = Path(__file__).parents[1] / "templates" / "pages" / f"{name}.html"
    if not html_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Fragment not found at {html_path}"
        )
    try:
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    except Exception as e:
        logger.error(f"Error serving fragment {name}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


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
    if (
        full_path.startswith("api/")
        or full_path == "api"
        or full_path.startswith("web/static/")
        or full_path == "web/static"
    ):
        raise HTTPException(status_code=404, detail="Not Found")
    index_path = Path(__file__).parents[1] / "templates" / "index.html"
    return FileResponse(index_path)


@app.get("/api/jobs")
async def list_jobs(
    status: str = None,
    limit: int = 50,
    db=Depends(lambda request: request.app.state.db),
    logger: Any = Depends(get_logger),
):
    """
    List jobs from the queue.
    """
    jobs = db.worker.list_jobs(status, limit)
    return jobs


@app.get("/api/jobs/{job_id}")
async def get_job_detail(
    job_id: int,
    db=Depends(lambda request: request.app.state.db),
    logger: Any = Depends(get_logger),
):
    """
    Get details for a specific job.
    """
    with db.worker.conn:
        cur = db.worker.conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
        row = cur.fetchone()
        if row:
            return dict(row)
        else:
            return JSONResponse(status_code=404, content={"error": "Job not found"})


@app.post("/api/jobs/cleanup")
async def cleanup_jobs(
    days: int = 30,
    db=Depends(lambda request: request.app.state.db),
    logger: Any = Depends(get_logger),
):
    deleted = db.worker.cleanup_jobs("jobs", days=days)
    logger.info(f"Cleaned up {deleted} jobs older than {days} days")
    return {"deleted": deleted, "days": days}


@app.get("/api/jobs/stats")
async def job_stats(
    db=Depends(lambda request: request.app.state.db),
    logger: Any = Depends(get_logger),
):
    return db.worker.job_stats()
