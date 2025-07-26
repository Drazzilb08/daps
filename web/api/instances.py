from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from util.config import config_file_path

router = APIRouter()


class TestInstanceRequest(BaseModel):
    """Request schema for testing a service instance."""

    service: str
    name: str
    url: str
    api: Optional[str] = None


def get_logger(request: Request, source="WEB") -> Any:
    return request.app.state.logger.get_adapter({"source": source})


def get_config() -> Dict[str, Any]:
    import yaml

    with open(config_file_path, "r") as f:
        return yaml.safe_load(f)


@router.get("/api/instances/", response_model=None)
async def get_instances(
    config: Dict[str, Any] = Depends(get_config), logger: any = Depends(get_logger)
) -> Any:
    """Returns dictionary Plex/Radarr/Sonarr instances"""
    try:
        logger.debug("Serving GET /api/instances")
        return config.get("instances", {})
    except Exception as e:
        logger.error(f"Error in /api/instances: {e}")


@router.get("/api/plex/libraries", response_model=None)
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
            logger.debug("Serving GET /api/plex/libraries for instance: %s", instance)
            res = requests.get(url, headers=headers, timeout=5)
        except requests.exceptions.RequestException as req_exc:
            logger.error(f"Plex request failed: {req_exc}")
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
        logger.error(f"Unexpected error in /api/plex/libraries: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/api/test-instance", response_model=None)
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
        logger.info(f"Testing: {name.upper()} - URL: {test_url}")
        resp = requests.get(test_url, headers=headers, timeout=5)
        if resp.ok:
            logger.info("Connection test: OK")
            return {"ok": True, "status": resp.status_code}
        if resp.status_code == 401:
            logger.error("Connection test code 401: Unauthorized - Invalid credentials")
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        if resp.status_code == 404:
            logger.error("Connection test code 404: Not Found - Invalid URL")
            return JSONResponse(status_code=404, content={"error": "Not Found"})
        logger.error(f"Connection test code {resp.status_code}: {resp.text}")
        return JSONResponse(status_code=resp.status_code, content={"error": resp.text})
    except Exception as e:
        logger.error(f"Connection test failed for {name} ({url}): {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
