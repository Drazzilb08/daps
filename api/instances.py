"""
Service instance management API endpoints for DAPS.

Provides instance configuration, testing, and library
retrieval for Plex, Radarr, and Sonarr integrations.
"""

from typing import Any, Optional

import requests
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.utils import error, get_logger, ok
from util.config import DapsConfig, load_config

router = APIRouter(
    prefix="/api",
    tags=["Service Instances"],
    responses={
        500: {"description": "Internal server error"},
        502: {"description": "External service connection failed"},
    },
)


class TestInstanceRequest(BaseModel):
    """Request schema for testing a service instance."""

    service: str
    name: str
    url: str
    api: Optional[str] = None


def get_config() -> DapsConfig:
    """Load and return the current configuration."""
    return load_config()


@router.get(
    "/instances",
    summary="Get service instances",
    description="Retrieve all configured Plex, Radarr, and Sonarr service instances.",
    responses={
        200: {
            "description": "Service instances retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Instances retrieved successfully",
                        "data": {
                            "plex": {
                                "main": {
                                    "url": "http://localhost:32400",
                                    "api": "abc123",
                                }
                            },
                            "radarr": {},
                            "sonarr": {},
                        },
                    }
                }
            },
        }
    },
)
async def get_instances(
    config: DapsConfig = Depends(get_config), logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Retrieve all configured service instances.

    Returns the complete configuration for all Plex, Radarr,
    and Sonarr instances including URLs and API credentials
    (masked for security). Used by the UI for instance selection.

    Returns:
        Complete service instance configuration
    """
    try:
        logger.debug("Serving GET /api/instances")
        instances_data = config.instances.model_dump(mode="python")

        return ok(
            "Instances retrieved successfully",
            instances_data,
        )

    except Exception as e:
        logger.error(f"Error retrieving instances: {e}")
        return error(
            f"Error retrieving instances: {str(e)}",
            code="INSTANCES_RETRIEVAL_ERROR",
            status_code=500,
        )


@router.get(
    "/plex/{instance}/libraries",
    summary="Get Plex libraries",
    description="Retrieve available library sections from a specific Plex instance.",
    responses={
        200: {
            "description": "Plex libraries retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Retrieved 2 libraries for Plex instance 'main'",
                        "data": {"libraries": ["Movies", "TV Shows"]},
                    }
                }
            },
        },
        404: {"description": "Plex instance not found in configuration"},
        502: {"description": "Failed to connect to Plex server"},
    },
)
async def get_plex_libraries(
    instance: str,
    config: DapsConfig = Depends(get_config),
    logger: Any = Depends(get_logger),
) -> JSONResponse:
    """
    Retrieve library sections from a Plex instance.

    Connects to the specified Plex instance using configured
    credentials and returns available library sections for
    configuration and filtering purposes.

    Args:
        instance: Name of the Plex instance from configuration

    Returns:
        List of available Plex library names
    """
    try:
        logger.debug("Serving GET /api/plex/libraries for instance: %s", instance)

        plex_data = config.instances.plex.get(instance)
        if not plex_data:
            return error(
                f"Plex instance '{instance}' not found",
                code="PLEX_INSTANCE_NOT_FOUND",
                status_code=404,
            )

        base_url = plex_data.url
        token = plex_data.api
        if not base_url or not token:
            return error(
                "Missing Plex API credentials for instance",
                code="PLEX_CREDENTIALS_MISSING",
                status_code=400,
            )

        headers = {"X-Plex-Token": token}
        url = f"{base_url}/library/sections"

        try:
            res = requests.get(url, headers=headers, timeout=5)
        except requests.exceptions.RequestException as req_exc:
            logger.error(f"Plex request failed: {req_exc}")
            return error(
                f"Failed to connect to Plex server: {str(req_exc)}",
                code="PLEX_CONNECTION_FAILED",
                status_code=502,
            )

        if not res.ok:
            return error(
                f"Plex server error: {res.text}",
                code="PLEX_SERVER_ERROR",
                status_code=res.status_code,
            )

        import xml.etree.ElementTree as ET

        root = ET.fromstring(res.text)
        libraries = [
            el.attrib["title"]
            for el in root.findall(".//Directory")
            if "title" in el.attrib
        ]

        return ok(
            f"Retrieved {len(libraries)} libraries for Plex instance '{instance}'",
            {"libraries": libraries},
        )

    except Exception as e:
        logger.error(f"Unexpected error retrieving Plex libraries: {e}")
        return error(
            f"Error retrieving Plex libraries: {str(e)}",
            code="PLEX_LIBRARIES_ERROR",
            status_code=500,
        )


@router.post(
    "/instances/test",
    summary="Test service instance",
    description="Test connectivity and authentication for a service instance.",
    responses={
        200: {
            "description": "Connection test successful",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Connection to Plex Main successful",
                        "data": {"status_code": 200},
                    }
                }
            },
        },
        401: {"description": "Authentication failed - invalid credentials"},
        404: {"description": "Service not found - invalid URL"},
        408: {"description": "Connection timeout"},
        502: {"description": "Connection failed - unable to reach server"},
    },
)
async def test_instance(
    data: TestInstanceRequest, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Test connectivity and authentication for a service instance.

    Validates that the provided URL and API credentials can successfully
    connect to the specified service. Used during configuration to verify
    instance settings before saving.

    Args:
        data: Service instance details to test (service type, name, URL, API key)

    Returns:
        Connection test results with status and error details
    """
    try:
        service = data.service
        name = data.name
        url = data.url
        api = data.api

        logger.info(f"Testing connection to {name.upper()} - URL: {url}")

        if not url:
            return error(
                "URL is required for instance testing",
                code="URL_MISSING",
                status_code=400,
            )

        url = url.rstrip("/")

        if service == "plex":
            headers = {"X-Plex-Token": api} if api else {}
            test_url = f"{url}/library/sections"
        else:
            headers = {"X-Api-Key": api} if api else {}
            test_url = f"{url}/api/v3/system/status"

        logger.debug(f"Testing connection to: {test_url}")

        resp = requests.get(test_url, headers=headers, timeout=5)

        if resp.ok:
            logger.info(f"Connection test successful for {name}")
            return ok(
                f"Connection to {name} successful",
                {"status_code": resp.status_code},
            )

        error_messages = {
            401: "Unauthorized - Invalid credentials",
            404: "Not Found - Invalid URL or endpoint",
            403: "Forbidden - Access denied",
        }

        error_message = error_messages.get(
            resp.status_code, f"Server error: {resp.text}"
        )
        logger.error(
            f"Connection test failed with status {resp.status_code}: {error_message}"
        )

        return error(
            error_message,
            code=f"HTTP_{resp.status_code}",
            status_code=resp.status_code,
        )

    except requests.exceptions.Timeout:
        logger.error(f"Connection test timeout for {data.name} ({data.url})")
        return error(
            "Connection timeout - server did not respond",
            code="CONNECTION_TIMEOUT",
            status_code=408,
        )
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error for {data.name} ({data.url})")
        return error(
            "Connection failed - unable to reach server",
            code="CONNECTION_FAILED",
            status_code=502,
        )
    except Exception as e:
        logger.error(f"Connection test failed for {data.name} ({data.url}): {e}")
        return error(
            f"Connection test error: {str(e)}",
            code="CONNECTION_TEST_ERROR",
            status_code=500,
        )
