import copy
import multiprocessing
import os
import time
from pathlib import Path
from threading import Thread
from typing import Any, Dict, List, Optional

import requests
import uvicorn
import yaml
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    FastAPI,
    HTTPException,
    Request,
)
from fastapi.requests import Request as FastAPIRequest
from fastapi.responses import (
    HTMLResponse,
    JSONResponse,
    PlainTextResponse,
    FileResponse,
)
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from util.config import Config
from util.utility import redact_apis
from util.version import get_version

load_dotenv(override=True)

if os.environ.get("DOCKER_ENV"):
    LOG_BASE_DIR = "/config/logs"
else:
    LOG_BASE_DIR = str((Path(__file__).parent.parent / "logs").resolve())


def load_config_dict() -> Dict[str, Any]:
    """Loads the configuration dictionary from file."""
    config_path = Config("main").config_path
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def save_config_dict(cfg: Dict[str, Any]) -> None:
    """Saves the configuration dictionary to file."""
    config_path = Config("main").config_path
    with open(config_path, "w") as f:
        yaml.safe_dump(cfg, f, sort_keys=False)


class RunRequest(BaseModel):
    """Request schema for running a module."""

    module: str


class CancelRequest(BaseModel):
    """Request schema for canceling a module."""

    module: str


class TestInstanceRequest(BaseModel):
    """Request schema for testing a service instance."""

    service: str
    name: str
    url: str
    api: Optional[str] = None


class NotificationPayload(BaseModel):
    """Request schema for test notification."""

    module: str
    notifications: Dict[str, Any]


def get_config() -> Dict[str, Any]:
    """Dependency: returns the current configuration."""
    return load_config_dict()


def get_logger(request: Request) -> Any:
    """Dependency: returns the logger from app state."""
    return request.app.state.logger


# ==== App and State ====
run_processes: Dict[str, multiprocessing.Process] = {}
run_time: Dict[str, float] = {}

app = FastAPI()
router = APIRouter()
app.state.logger = None

# ==== Centralized Error Handler ====


@app.exception_handler(Exception)
async def handle_exception(request: FastAPIRequest, exc: Exception):
    """Handles uncaught exceptions and logs them."""
    logger = getattr(request.app.state, "logger", None)
    if logger:
        logger.error(f"[WEB] Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": str(exc)})


# ==== Helper: Log Route ====
def log_route(logger: Any, path: str, method: str = "GET") -> None:
    """Logs web route access."""
    logger.debug(f"[WEB] Serving {method} {path}")


# ==== Routes ====
@app.get("/api/version", response_model=None)
async def get_version_route(
    request: Request, logger: Any = Depends(get_logger)
) -> PlainTextResponse:
    """Returns the current version string."""
    try:
        version = get_version()
        logger.debug(f"[WEB] Serving GET /api/version: {version}")
    except Exception:
        version = "unknown"
    return PlainTextResponse(version)


@app.post("/api/test-notification", response_model=None)
async def test_notification(
    payload: NotificationPayload, logger: Any = Depends(get_logger)
) -> Any:
    """Sends a test notification and returns the result."""
    logger.debug(
        "[WEB] Serving POST /api/test-notification for module: %s", payload.module
    )
    from util.notification import send_test_notification

    try:
        results = send_test_notification(payload.dict(), logger)
        logger.debug("[WEB] Test notification results: %s", results)
        return results
    except Exception as e:
        logger.error("[WEB] Test notification failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


app.mount(
    "/web/static",
    StaticFiles(directory=Path(__file__).parent / "static"),
    name="static",
)


@app.get("/", response_class=HTMLResponse, response_model=None)
async def root() -> HTMLResponse:
    """Serves the main index.html page."""
    html_path = Path(__file__).parent / "templates" / "index.html"
    try:
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/config", response_model=None)
async def get_config_route(
    config: Dict[str, Any] = Depends(get_config), logger: Any = Depends(get_logger)
) -> Dict[str, Any]:
    """Returns the current configuration as a dictionary."""
    log_route(logger, "/api/config")
    return config


@app.post("/api/config", response_model=None)
async def update_config_route(
    request: Request,
    logger: Any = Depends(get_logger),
    config: Dict[str, Any] = Depends(get_config),
) -> Any:
    """Updates the configuration file with provided values."""
    try:
        incoming = await request.json()
        incoming_copy = copy.deepcopy(incoming)
        if "instances" in incoming_copy:
            redact_apis(incoming_copy["instances"])
        logger.debug("[WEB] Serving POST /api/config with payload: %s", incoming_copy)
        current_config = load_config_dict()
        new_schedule = incoming.get("schedule")
        new_instances = incoming.get("instances")
        new_notifications = incoming.get("notifications")
        if new_schedule is not None:
            if "schedule" not in current_config:
                current_config["schedule"] = {}
            for key, value in new_schedule.items():
                current_config["schedule"][key] = value
        if new_instances is not None:
            current_config["instances"] = new_instances
        if new_notifications is not None:
            current_config["notifications"] = new_notifications
        for mod_name, mod_payload in incoming.items():
            if mod_name in ("schedule", "instances", "notifications"):
                continue
            if (
                "bash_scripts" in current_config
                and mod_name in current_config["bash_scripts"]
            ):
                target = current_config["bash_scripts"][mod_name]
            else:
                target = current_config.setdefault(mod_name, {})
            for field, val in mod_payload.items():
                target[field] = val
        save_config_dict(current_config)
        logger.info("[WEB] Config entries updated")
        return {"status": "success"}
    except Exception as e:
        logger.error("[WEB] Config update failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/list", response_model=None)
async def list_dir(path: str = "/") -> Any:
    """Returns subdirectories for a given path."""
    resolved = Path(path).expanduser().resolve()
    if not resolved.exists() or not resolved.is_dir():
        try:
            return JSONResponse(status_code=400, content={"error": "Invalid path"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})
    dirs = [
        p.name for p in resolved.iterdir() if p.is_dir() and not p.name.startswith(".")
    ]
    dirs.sort()
    return {"directories": dirs}


@app.get("/api/plex/libraries", response_model=None)
async def get_plex_libraries(
    instance: str,
    config: Dict[str, Any] = Depends(get_config),
    logger: Any = Depends(get_logger),
) -> Any:
    """Returns library names for a specific Plex instance."""
    try:
        plex_data = config.get("instances", {}).get("plex", {}).get(instance)
        if not plex_data:
            return JSONResponse(
                status_code=404, content={"error": "Plex instance not found"}
            )
        base_url = plex_data.get("url")
        token = plex_data.get("api")
        if not base_url or not token:
            return JSONResponse(
                status_code=400, content={"error": "Missing Plex API credentials"}
            )
        headers = {"X-Plex-Token": token}
        url = f"{base_url}/library/sections"
        try:
            logger.debug(
                "[WEB] Serving GET /api/plex/libraries for instance: %s", instance
            )
            res = requests.get(url, headers=headers, timeout=5)
        except requests.exceptions.RequestException as req_exc:
            logger.error(f"[WEB] Plex request failed: {req_exc}")
            return JSONResponse(
                status_code=502,
                content={"error": f"Failed to connect to Plex server: {req_exc}"},
            )
        if not res.ok:
            return JSONResponse(
                status_code=res.status_code, content={"error": res.text}
            )
        xml = res.text
        import xml.etree.ElementTree as ET

        root = ET.fromstring(xml)
        libraries = [
            el.attrib["title"]
            for el in root.findall(".//Directory")
            if "title" in el.attrib
        ]
        return libraries
    except Exception as e:
        logger.error(f"[WEB] Unexpected error in /api/plex/libraries: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/run", response_model=None)
async def run_module(
    data: RunRequest, background: BackgroundTasks, logger: Any = Depends(get_logger)
) -> Any:
    """Starts a module process in the background if not already running."""
    from main import run_module, list_of_python_modules

    module = data.module
    logger.debug("[WEB] Serving POST /api/run for module: %s", module)
    if module not in list_of_python_modules:
        logger.error(f"[WEB] Unknown module: {module}")
        return JSONResponse(
            status_code=400, content={"error": f"Unknown module: {module}"}
        )
    if module in run_processes and run_processes[module].is_alive():
        logger.error(f"[WEB] Module {module} is already running")
        return JSONResponse(
            status_code=400, content={"error": f"Module {module} is already running"}
        )

    def background_run():
        start = time.time()
        logger.info(f"[WEB] Background starting module: {module}")
        run_time[module] = start
        proc = run_module(module)
        if proc:
            run_processes[module] = proc
        else:
            logger.error(f"[WEB] Failed to start module: {module}")

    background.add_task(background_run)
    return {"status": "starting", "module": module}


@app.get("/api/status", response_model=None)
async def module_status(module: str, logger: Any = Depends(get_logger)) -> Any:
    """Queries the running status of a given module."""
    proc = run_processes.get(module)
    if not proc and getattr(app.state, "manager", None):
        proc = app.state.manager.running_modules.get(module)
    alive = False
    if proc:
        alive = proc.is_alive()
        if not alive:
            start_time = run_time.pop(module, None)
            if start_time is not None:
                duration = time.time() - start_time
                hours, rem = divmod(duration, 3600)
                minutes, seconds = divmod(rem, 60)
                human_duration = f"{int(hours)}:{int(minutes):02d}:{int(seconds):02d}"
                logger.info(
                    f"[WEB] Module: {module} finished in {human_duration} (raw: {duration:.2f} seconds)"
                )
            if proc in run_processes.values():
                del run_processes[module]
            elif (
                getattr(app.state, "manager", None)
                and module in app.state.manager.running_modules
            ):
                del app.state.manager.running_modules[module]
    try:
        return {"module": module, "running": alive}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/cancel", response_model=None)
async def cancel_module(data: CancelRequest, logger: Any = Depends(get_logger)) -> Any:
    """Cancels a running module."""
    module = data.module
    proc = run_processes.get(module)
    scheduled = False
    if not proc and getattr(app.state, "manager", None):
        proc = app.state.manager.running_modules.get(module)
        scheduled = True
    if not proc:
        try:
            return JSONResponse(
                status_code=400, content={"error": "Module not running"}
            )
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})
    proc.terminate()
    logger.info(f"[WEB] Manually cancelled module: {module}")
    if scheduled:
        del app.state.manager.running_modules[module]
    else:
        del run_processes[module]
    return {"status": "cancelled", "module": module}


@app.post("/api/test-instance", response_model=None)
async def test_instance(
    data: TestInstanceRequest, logger: Any = Depends(get_logger)
) -> Any:
    """Tests the connection to a service instance and returns the result."""
    service = data.service
    name = data.name
    url = data.url
    api = data.api
    if not url:
        return JSONResponse(status_code=400, content={"error": "Missing URL"})
    try:
        url = url.rstrip("/")
        if service == "plex":
            headers = {"X-Plex-Token": api} if api else {}
            test_url = f"{url}/library/sections"
        else:
            headers = {"X-Api-Key": api} if api else {}
            test_url = f"{url}/api/v3/system/status"
        logger.info(f"[WEB] Testing: {name.upper()} - URL: {test_url}")
        resp = requests.get(test_url, headers=headers, timeout=5)
        if resp.ok:
            logger.info(f"[WEB] Connection test: OK")
            return {"ok": True, "status": resp.status_code}
        if resp.status_code == 401:
            logger.error(
                f"[WEB] Connection test code 401: Unauthorized - Invalid credentials"
            )
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        if resp.status_code == 404:
            logger.error(f"[WEB] Connection test code 404: Not Found - Invalid URL")
            return JSONResponse(status_code=404, content={"error": "Not Found"})
        logger.error(f"[WEB] Connection test code {resp.status_code}: {resp.text}")
        return JSONResponse(status_code=resp.status_code, content={"error": resp.text})
    except Exception as e:
        logger.error(f"[WEB] Connection test failed for {name} ({url}): {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/create-folder", response_model=None)
async def create_folder(path: str, logger: Any = Depends(get_logger)) -> Any:
    """Creates a folder at the given path."""
    resolved = Path(path).expanduser().resolve()
    try:
        logger.info(f"[WEB] Creating folder: {resolved}")
        resolved.mkdir(parents=True, exist_ok=False)
        return {"status": "created"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/pages/{fragment_name}", response_class=HTMLResponse, response_model=None)
async def serve_fragment(fragment_name: str, logger: Any = Depends(get_logger)) -> Any:
    """Serves a named HTML fragment from the fragments directory."""
    html_path = (
        Path(__file__).parent
        / "templates"
        / "pages"
        / f"{fragment_name}.html"
    )
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="Fragment not found")
    try:
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ========== Logs API ==========
@router.get("/api/logs")
async def list_logs(logger: Any = Depends(get_logger)) -> Dict[str, List[str]]:
    """Lists available log files for each module."""
    logger.info("[WEB] Listing logs in %s", LOG_BASE_DIR)
    logs_data: Dict[str, List[str]] = {}
    if not os.path.exists(LOG_BASE_DIR):
        logger.error("[WEB] Log directory not found: %s", LOG_BASE_DIR)
        raise HTTPException(status_code=404, detail="Log directory not found.")
    for module in os.listdir(LOG_BASE_DIR):
        if module == "debug":
            logger.debug(f"[WEB] Skipping {module} folder")
            continue
        module_path = os.path.join(LOG_BASE_DIR, module)
        if os.path.isdir(module_path):
            files = sorted(
                f
                for f in os.listdir(module_path)
                if os.path.isfile(os.path.join(module_path, f))
            )
            logs_data[module] = files
    logger.info("[WEB] Logs listed: %s", list(logs_data.keys()))
    return logs_data


@router.get("/api/logs/{module}/{filename}", response_class=PlainTextResponse)
async def read_log(
    module: str, filename: str, logger: Any = Depends(get_logger)
) -> str:
    """Reads a specific log file and returns its content as plain text."""
    safe_module = os.path.basename(module)
    safe_filename = os.path.basename(filename)
    if safe_module == "debug":
        raise HTTPException(status_code=404, detail="Log file not found.")
    log_path = os.path.join(LOG_BASE_DIR, safe_module, safe_filename)
    if "debug" in os.path.relpath(log_path, LOG_BASE_DIR).split(os.sep):
        raise HTTPException(status_code=404, detail="Log file not found.")
    if not os.path.exists(log_path):
        raise HTTPException(status_code=404, detail="Log file not found.")
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return content


@app.post("/api/poster-search-stats", response_model=None)
async def poster_search_stats(request: Request, logger: Any = Depends(get_logger)):
    """Returns stats and file list for a given poster location directory."""
    try:
        data = await request.json()
        location = data.get("location")
        logger.debug(f"[WEB] Serving POST /api/poster-search-stats for location: {location}")
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
                except Exception:
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


@app.get("/api/preview-poster")
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


# ========== Web Server Startup ==========
def start_web_server(logger: Any) -> None:
    """Starts the web server in a background thread and stores logger in app state.

    Args:
      logger: Logger instance to use for the app.
    """
    app.state.logger = logger
    try:
        app.state.config_data = load_config_dict()
    except Exception as e:
        logger.error(f"[WEB] Failed to load config: {e}")
        app.state.config_data = {}
    PORT = int(os.environ.get("PORT", 8000))
    HOST = os.environ.get("HOST", "127.0.0.1")
    app.state.logger.info(f"[WEB] Starting web server on {HOST}:{PORT}")
    web_thread = Thread(
        target=lambda: uvicorn.run(app, host=HOST, port=PORT, log_level="warning"),
        daemon=True,
    )
    web_thread.start()
    app.include_router(router)
