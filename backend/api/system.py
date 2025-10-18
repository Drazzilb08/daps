"""
System-level API endpoints for DAPS.

Provides core system functionality including version information,
directory operations, and testing utilities.
"""

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.api.utils import error, get_logger, ok
from backend.util.version import get_version

router = APIRouter(
    prefix="/api",
    tags=["System"],
    responses={
        500: {"description": "Internal server error"},
        400: {"description": "Bad request"},
    },
)


class TestEndpointRequest(BaseModel):
    """Request model for the test endpoint."""

    message: str = "test"
    data: Any = None


class FolderCreationRequest(BaseModel):
    """Request model for folder creation."""

    path: str


@router.get(
    "/version",
    summary="Get application version",
    description="Returns the current DAPS application version information.",
    responses={
        200: {
            "description": "Version information retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Version retrieved",
                        "data": {"version": "3.0.0-alpha"},
                    }
                }
            },
        }
    },
)
async def get_version_endpoint(logger: Any = Depends(get_logger)) -> JSONResponse:
    """
    Get the current application version.

    Returns version information from the build system for display
    in the UI and for API client compatibility checks.
    """
    try:
        version = get_version()
        logger.debug(f"Serving GET /api/version: {version}")
        return ok("Version retrieved", {"version": version})
    except Exception as e:
        logger.error(f"Error getting version: {e}")
        return error(
            f"Error getting version: {str(e)}", code="VERSION_ERROR", status_code=500
        )


@router.get(
    "/directory",
    summary="List directory contents",
    description="Lists directories within the specified path for configuration and file management.",
    responses={
        200: {
            "description": "Directory listing retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Listed 3 directories",
                        "data": {
                            "directories": ["Documents", "Downloads", "Pictures"],
                            "exists": True,
                            "writable": True,
                        },
                    }
                }
            },
        },
        400: {"description": "Invalid path or path does not exist"},
    },
)
async def list_directory(
    path: str = "/", logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    List directories within a specified path.

    Used by the UI for path selection in configuration forms.
    Only returns directories, not files, and excludes hidden directories.
    Includes metadata about path existence and write permissions.

    Args:
        path: The directory path to list (defaults to root)

    Returns:
        Dictionary containing directories list and path metadata
    """
    try:
        resolved = Path(path).expanduser().resolve()
        if not resolved.exists() or not resolved.is_dir():
            return error(
                "Invalid path",
                code="INVALID_PATH",
                status_code=400,
                data={"directories": [], "exists": False, "writable": False},
            )

        dirs = [
            p.name
            for p in resolved.iterdir()
            if p.is_dir() and not p.name.startswith(".")
        ]
        dirs.sort()

        return ok(
            f"Listed {len(dirs)} directories",
            {
                "directories": dirs,
                "exists": True,
                "writable": os.access(resolved, os.W_OK),
            },
        )
    except Exception as e:
        logger.error(f"Error listing directory {path}: {e}")
        return error(
            f"Error listing directory: {str(e)}",
            code="DIRECTORY_LIST_ERROR",
            status_code=500,
        )


@router.post(
    "/folder",
    summary="Create directory",
    description="Creates a new directory at the specified path with parent directory creation.",
    responses={
        200: {
            "description": "Directory created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Folder created",
                        "data": {"path": "/home/user/new-folder"},
                    }
                }
            },
        },
        400: {"description": "Invalid path or directory already exists"},
    },
)
async def create_directory(
    request_data: FolderCreationRequest, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Create a new directory at the specified path.

    Creates parent directories as needed. Used by the UI when
    users need to create directories during configuration.

    Args:
        request_data: Request containing the directory path to create

    Returns:
        Success confirmation with the created path
    """
    try:
        path = request_data.path
        resolved = Path(path).expanduser().resolve()
        logger.info(f"Creating folder: {resolved}")
        resolved.mkdir(parents=True, exist_ok=False)

        return ok("Folder created", {"path": str(resolved)})
    except FileExistsError:
        logger.warning(f"Folder already exists: {path}")
        return error(
            "Folder already exists",
            code="FOLDER_EXISTS",
            status_code=400,
        )
    except Exception as e:
        logger.error(f"Error creating folder {path}: {e}")
        return error(
            f"Error creating folder: {str(e)}",
            code="FOLDER_CREATION_ERROR",
            status_code=500,
        )


@router.post(
    "/test",
    summary="Test endpoint",
    description="Generic test endpoint for API connectivity and payload echo testing.",
    responses={
        200: {
            "description": "Test endpoint response with echoed data",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Test endpoint working",
                        "data": {"received": {"message": "test", "data": None}},
                    }
                }
            },
        },
        400: {"description": "Invalid request data"},
    },
)
async def test(
    request_data: TestEndpointRequest, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Generic test endpoint for API connectivity.

    Echoes back the received data to verify API communication
    and JSON serialization. Used for debugging and health checks.

    Args:
        request_data: Test data to echo back

    Returns:
        Success response with the received data
    """
    logger.debug("Serving POST /api/test")
    try:
        received_data = request_data.model_dump()
        logger.debug(f"Received data: {received_data}")

        return ok("Test endpoint working", {"received": received_data})
    except Exception as e:
        logger.error(f"Error processing test request: {e}")
        return error(
            f"Error processing test request: {str(e)}",
            code="TEST_ENDPOINT_ERROR",
            status_code=400,
        )
