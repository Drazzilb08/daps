from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


# Schemas
class RunRequest(BaseModel):
    module: str

class CancelRequest(BaseModel):
    module: str

router = APIRouter()

def get_logger(request: Request) -> Any:
    return request.app.state.logger

@router.post("/api/run")
async def run_module(
    request: Request,
    data: RunRequest,
    logger: Any = Depends(get_logger),
):
    module = data.module
    logger.debug("[WEB] Serving POST /api/run for module: %s", module)
    orchestrator = getattr(request.app.state, "orchestrator", None)
    if orchestrator is None:
        logger.error("[WEB] Orchestrator not available in app state")
        return JSONResponse(status_code=500, content={"error": "Orchestrator not available"})
    running = orchestrator.get_running()
    if module in running and running[module] is not None and running[module]["proc"].is_alive():
        logger.error(f"[WEB] Module {module} is already running")
        return JSONResponse(
            status_code=400, content={"error": f"Module {module} is already running"}
        )
    proc_entry = orchestrator.launch_module(module, origin="web")
    if proc_entry is None:
        logger.error(f"[WEB] Failed to start module: {module}")
        return JSONResponse(status_code=500, content={"error": f"Failed to start module: {module}"})
    orchestrator.running[module] = proc_entry
    return {"status": "starting", "module": module}

@router.get("/api/status")
async def module_status(
    request: Request, module: str, logger: Any = Depends(get_logger)
):
    orchestrator = getattr(request.app.state, "orchestrator", None)
    if orchestrator is None:
        logger.error("[WEB] Orchestrator not available in app state")
        return JSONResponse(status_code=500, content={"error": "Orchestrator not available"})
    running = orchestrator.get_running()
    entry = running.get(module)
    if entry is not None:
        proc = entry["proc"]
        origin = entry["origin"]
        alive = proc.is_alive()
    else:
        proc = None
        origin = None
        alive = False
    try:
        return {"module": module, "running": alive, "origin": origin}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/api/cancel")
async def cancel_module(
    request: Request, data: CancelRequest, logger: Any = Depends(get_logger)
):
    module = data.module
    orchestrator = getattr(request.app.state, "orchestrator", None)
    if orchestrator is None:
        logger.error("[WEB] Orchestrator not available in app state")
        return JSONResponse(status_code=500, content={"error": "Orchestrator not available"})
    running = orchestrator.get_running()
    entry = running.get(module)
    if not entry or not entry["proc"].is_alive():
        return JSONResponse(
            status_code=400, content={"error": "Module not running"}
        )
    entry["proc"].terminate()
    logger.info(f"[WEB] Manually cancelled module: {module}")
    del orchestrator.running[module]
    return {"status": "cancelled", "module": module}

@router.get("/api/run_state")
async def get_all_run_states(request: Request, logger: Any = Depends(get_logger)):
    """Get last run status for all modules (for schedule cards)."""
    orchestrator = getattr(request.app.state, "orchestrator", None)
    if orchestrator is None:
        logger.error("[WEB] Orchestrator not available in app state")
        return JSONResponse(status_code=500, content={"error": "Orchestrator not available"})
    try:
        db = orchestrator.db if hasattr(orchestrator, "db") else None
        if db is None:
            return JSONResponse(status_code=500, content={"error": "DB not available on orchestrator"})
        run_states = db.get_all_run_states()
        return {"run_states": run_states}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})