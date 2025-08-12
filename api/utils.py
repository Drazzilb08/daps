# api/utils.py

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


def get_logger(request: Request, source="WEB") -> Any:
    return request.app.state.logger.get_adapter(source)


def ok(message: str, data: Any | None = None, status_code: int = 200):
    """Standard success response factory."""
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return JSONResponse(status_code=status_code, content=payload)


def error(
    message: str,
    code: str = "UNKNOWN_ERROR",
    *,
    data: Any | None = None,
    status_code: int = 400,
):
    """Standard error response factory."""
    payload = {"success": False, "message": message, "error_code": code}
    if data is not None:
        payload["data"] = data
    return JSONResponse(status_code=status_code, content=payload)
