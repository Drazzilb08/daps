# api/utils.py

from typing import Any, Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from backend.util.database import DapsDB


def get_logger(request: Request, source: str = "WEB") -> Any:
    return request.app.state.logger.get_adapter(source)


def get_database(request: Request) -> DapsDB:
    """
    Dependency injection for shared database instance.
    Returns the same database context for all API calls.
    """
    # Temporary debug logging
    logger = request.app.state.logger.get_adapter("DB_INJECTION")

    if not hasattr(request.app.state, "db"):
        logger.error("No shared database found in app.state!")
        raise RuntimeError("Database not available in app state")

    return request.app.state.db


def ok(
    message: str, data: Optional[Any] = None, status_code: int = 200
) -> JSONResponse:
    """Standard success response factory."""
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return JSONResponse(status_code=status_code, content=payload)


def error(
    message: str,
    code: str = "UNKNOWN_ERROR",
    *,
    data: Optional[Any] = None,
    status_code: int = 400,
) -> JSONResponse:
    """Standard error response factory."""
    payload = {"success": False, "message": message, "error_code": code}
    if data is not None:
        payload["data"] = data
    return JSONResponse(status_code=status_code, content=payload)
