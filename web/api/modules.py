from fastapi import APIRouter, BackgroundTasks, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any

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
    background: BackgroundTasks,
    logger: Any = Depends(get_logger),
):
    module = data.module
    logger.debug("[WEB] Serving POST /api/run for module: %s", module)
    orchestrator = getattr(request.app.state, "orchestrator", None)
    if orchestrator is None:
        logger.error("[WEB] Orchestrator not available in app state")
        return JSONResponse(status_code=500, content={"error": "Orchestrator not available"})
    running = orchestrator.get_running()
    if module in running and running[module] is not None and running[module].is_alive():
        logger.error(f"[WEB] Module {module} is already running")
        return JSONResponse(
            status_code=400, content={"error": f"Module {module} is already running"}
        )
    def background_run():
        logger.info(f"[WEB] Background starting module: {module}")
        proc = orchestrator.launch_module(module)
        if proc is None:
            logger.error(f"[WEB] Failed to start module: {module}")
    background.add_task(background_run)
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
    proc = running.get(module)
    alive = proc.is_alive() if proc else False
    try:
        return {"module": module, "running": alive}
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
    proc = running.get(module)
    if not proc or not proc.is_alive():
        return JSONResponse(
            status_code=400, content={"error": "Module not running"}
        )
    proc.terminate()
    logger.info(f"[WEB] Manually cancelled module: {module}")
    del orchestrator.running[module]
    return {"status": "cancelled", "module": module}