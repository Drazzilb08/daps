from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.utils import get_logger
from util.config import DapsConfig, load_config

router = APIRouter()


class TestInstanceRequest(BaseModel):
    """Request schema for testing a service instance."""

    service: str
    name: str
    url: str
    api: Optional[str] = None


def get_config() -> DapsConfig:
    """Load and return the current configuration."""
    return load_config()


@router.get("/api/instances/")
async def get_instances(
    config: DapsConfig = Depends(get_config), logger: Any = Depends(get_logger)
) -> Dict[str, Any]:
    """
    Retrieve all configured Plex/Radarr/Sonarr instances.

    Returns a dictionary containing all service instances from configuration.
    """
    try:
        logger.debug("Serving GET /api/instances")
        instances_data = config.instances.model_dump(mode="python")

        return {
            "success": True,
            "message": "Instances retrieved successfully",
            "data": instances_data,
        }

    except Exception as e:
        logger.error(f"Error retrieving instances: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving instances: {str(e)}",
                "error_code": "INSTANCES_RETRIEVAL_ERROR",
            },
        )


@router.get("/api/plex/libraries")
async def get_plex_libraries(
    instance: str,
    config: DapsConfig = Depends(get_config),
    logger: Any = Depends(get_logger),
) -> Dict[str, Any]:
    """
    Retrieve library names for a specific Plex instance.

    Connects to the specified Plex instance and returns available library sections.
    """
    try:
        logger.debug("Serving GET /api/plex/libraries for instance: %s", instance)

        plex_data = config.instances.plex.get(instance)
        if not plex_data:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": f"Plex instance '{instance}' not found",
                    "error_code": "PLEX_INSTANCE_NOT_FOUND",
                },
            )

        base_url = plex_data.url
        token = plex_data.api
        if not base_url or not token:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Missing Plex API credentials for instance",
                    "error_code": "PLEX_CREDENTIALS_MISSING",
                },
            )

        headers = {"X-Plex-Token": token}
        url = f"{base_url}/library/sections"

        try:
            res = requests.get(url, headers=headers, timeout=5)
        except requests.exceptions.RequestException as req_exc:
            logger.error(f"Plex request failed: {req_exc}")
            return JSONResponse(
                status_code=502,
                content={
                    "success": False,
                    "message": f"Failed to connect to Plex server: {str(req_exc)}",
                    "error_code": "PLEX_CONNECTION_FAILED",
                },
            )

        if not res.ok:
            return JSONResponse(
                status_code=res.status_code,
                content={
                    "success": False,
                    "message": f"Plex server error: {res.text}",
                    "error_code": "PLEX_SERVER_ERROR",
                },
            )

        import xml.etree.ElementTree as ET

        root = ET.fromstring(res.text)
        libraries = [
            el.attrib["title"]
            for el in root.findall(".//Directory")
            if "title" in el.attrib
        ]

        return {
            "success": True,
            "message": f"Retrieved {len(libraries)} libraries for Plex instance '{instance}'",
            "data": {"libraries": libraries},
        }

    except Exception as e:
        logger.error(f"Unexpected error retrieving Plex libraries: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Error retrieving Plex libraries: {str(e)}",
                "error_code": "PLEX_LIBRARIES_ERROR",
            },
        )


@router.post("/api/test-instance")
async def test_instance(
    data: TestInstanceRequest, logger: Any = Depends(get_logger)
) -> Dict[str, Any]:
    """
    Test the connection to a service instance.

    Validates connectivity and authentication for Plex/Radarr/Sonarr instances.
    """
    try:
        service = data.service
        name = data.name
        url = data.url
        api = data.api

        logger.info(f"Testing connection to {name.upper()} - URL: {url}")

        if not url:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "URL is required for instance testing",
                    "error_code": "URL_MISSING",
                },
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
            return {
                "success": True,
                "message": f"Connection to {name} successful",
                "data": {"status_code": resp.status_code},
            }

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

        return JSONResponse(
            status_code=resp.status_code,
            content={
                "success": False,
                "message": error_message,
                "error_code": f"HTTP_{resp.status_code}",
            },
        )

    except requests.exceptions.Timeout:
        logger.error(f"Connection test timeout for {data.name} ({data.url})")
        return JSONResponse(
            status_code=408,
            content={
                "success": False,
                "message": "Connection timeout - server did not respond",
                "error_code": "CONNECTION_TIMEOUT",
            },
        )
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error for {data.name} ({data.url})")
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "message": "Connection failed - unable to reach server",
                "error_code": "CONNECTION_FAILED",
            },
        )
    except Exception as e:
        logger.error(f"Connection test failed for {data.name} ({data.url}): {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Connection test error: {str(e)}",
                "error_code": "CONNECTION_TEST_ERROR",
            },
        )
