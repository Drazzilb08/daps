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
from util.config import DapsConfig, InstanceDetail, load_config, save_config

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


class CreateInstanceRequest(BaseModel):
    """Request schema for creating a service instance."""

    service: str
    name: str
    url: str
    api: str


class UpdateInstanceRequest(BaseModel):
    """Request schema for updating a service instance."""

    service: str
    name: str
    url: str
    api: str


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


@router.post(
    "/instances",
    summary="Create service instance",
    description="Create a new Plex, Radarr, or Sonarr service instance in configuration.",
    responses={
        200: {
            "description": "Instance created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Instance 'radarr_hd' created successfully",
                        "data": {"service": "radarr", "name": "radarr_hd"},
                    }
                }
            },
        },
        400: {"description": "Invalid service type or instance already exists"},
        500: {"description": "Configuration save failed"},
    },
)
async def create_instance(
    data: CreateInstanceRequest, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Create a new service instance in configuration.

    Validates the service type, ensures the instance name doesn't already exist,
    and persists the new instance to config.yml.

    Args:
        data: Instance details (service type, name, URL, API key)

    Returns:
        Success confirmation with created instance details
    """
    try:
        service = data.service.lower()
        name = data.name
        url = data.url.rstrip("/")
        api_key = data.api

        logger.info(f"Creating new {service} instance: {name}")

        # Validate service type
        if service not in ["plex", "radarr", "sonarr"]:
            return error(
                f"Invalid service type: {service}. Must be plex, radarr, or sonarr",
                code="INVALID_SERVICE_TYPE",
                status_code=400,
            )

        # Load current config
        config = load_config()

        # Check if instance already exists
        service_instances = getattr(config.instances, service)
        if name in service_instances:
            return error(
                f"Instance '{name}' already exists for service '{service}'",
                code="INSTANCE_ALREADY_EXISTS",
                status_code=400,
            )

        # Create new instance detail
        new_instance = InstanceDetail(url=url, api=api_key)

        # Add to appropriate service section
        service_instances[name] = new_instance

        # Save updated configuration
        save_config(config)

        logger.info(f"Successfully created {service} instance: {name}")
        return ok(
            f"Instance '{name}' created successfully",
            {"service": service, "name": name},
        )

    except Exception as e:
        logger.error(f"Failed to create instance {data.name}: {e}")
        return error(
            f"Failed to create instance: {str(e)}",
            code="INSTANCE_CREATE_ERROR",
            status_code=500,
        )


@router.put(
    "/instances/{instance_id}",
    summary="Update service instance",
    description="Update an existing Plex, Radarr, or Sonarr service instance configuration.",
    responses={
        200: {
            "description": "Instance updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Instance 'radarr_hd' updated successfully",
                        "data": {"service": "radarr", "name": "radarr_hd"},
                    }
                }
            },
        },
        404: {"description": "Instance not found"},
        400: {"description": "Invalid service type"},
        500: {"description": "Configuration save failed"},
    },
)
async def update_instance(
    instance_id: str, data: UpdateInstanceRequest, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Update an existing service instance configuration.

    Validates the service type, ensures the instance exists, and updates
    the URL and API key in config.yml. Supports renaming instances.

    Args:
        instance_id: Current instance name (from URL path)
        data: Updated instance details (service type, name, URL, API key)

    Returns:
        Success confirmation with updated instance details
    """
    try:
        service = data.service.lower()
        new_name = data.name
        url = data.url.rstrip("/")
        api_key = data.api

        logger.info(f"Updating {service} instance: {instance_id}")

        # Validate service type
        if service not in ["plex", "radarr", "sonarr"]:
            return error(
                f"Invalid service type: {service}. Must be plex, radarr, or sonarr",
                code="INVALID_SERVICE_TYPE",
                status_code=400,
            )

        # Load current config
        config = load_config()

        # Get service instances
        service_instances = getattr(config.instances, service)

        # Check if instance exists
        if instance_id not in service_instances:
            return error(
                f"Instance '{instance_id}' not found for service '{service}'",
                code="INSTANCE_NOT_FOUND",
                status_code=404,
            )

        # Handle renaming: if new name differs from instance_id
        if new_name != instance_id:
            # Check if new name already exists
            if new_name in service_instances:
                return error(
                    f"Instance '{new_name}' already exists for service '{service}'",
                    code="INSTANCE_NAME_CONFLICT",
                    status_code=400,
                )

            # Remove old instance
            del service_instances[instance_id]
            logger.info(f"Renaming instance from '{instance_id}' to '{new_name}'")

        # Create/update instance with new values
        updated_instance = InstanceDetail(url=url, api=api_key)
        service_instances[new_name] = updated_instance

        # Save updated configuration
        save_config(config)

        logger.info(f"Successfully updated {service} instance: {new_name}")
        return ok(
            f"Instance '{new_name}' updated successfully",
            {"service": service, "name": new_name},
        )

    except Exception as e:
        logger.error(f"Failed to update instance {instance_id}: {e}")
        return error(
            f"Failed to update instance: {str(e)}",
            code="INSTANCE_UPDATE_ERROR",
            status_code=500,
        )


@router.delete(
    "/instances/{instance_id}",
    summary="Delete service instance",
    description="Remove a Plex, Radarr, or Sonarr service instance from configuration.",
    responses={
        200: {
            "description": "Instance deleted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Instance 'radarr_hd' deleted successfully",
                        "data": {"name": "radarr_hd"},
                    }
                }
            },
        },
        404: {"description": "Instance not found"},
        400: {"description": "Service type required in query parameter"},
        500: {"description": "Configuration save failed"},
    },
)
async def delete_instance(
    instance_id: str, service: str, logger: Any = Depends(get_logger)
) -> JSONResponse:
    """
    Delete a service instance from configuration.

    Removes the specified instance from the appropriate service section
    in config.yml. This operation is permanent.

    Args:
        instance_id: Instance name to delete
        service: Service type (plex, radarr, or sonarr) as query parameter

    Returns:
        Success confirmation with deleted instance name
    """
    try:
        service = service.lower()

        logger.info(f"Deleting {service} instance: {instance_id}")

        # Validate service type
        if service not in ["plex", "radarr", "sonarr"]:
            return error(
                f"Invalid service type: {service}. Must be plex, radarr, or sonarr",
                code="INVALID_SERVICE_TYPE",
                status_code=400,
            )

        # Load current config
        config = load_config()

        # Get service instances
        service_instances = getattr(config.instances, service)

        # Check if instance exists
        if instance_id not in service_instances:
            return error(
                f"Instance '{instance_id}' not found for service '{service}'",
                code="INSTANCE_NOT_FOUND",
                status_code=404,
            )

        # Delete the instance
        del service_instances[instance_id]

        # Save updated configuration
        save_config(config)

        logger.info(f"Successfully deleted {service} instance: {instance_id}")
        return ok(
            f"Instance '{instance_id}' deleted successfully",
            {"name": instance_id},
        )

    except Exception as e:
        logger.error(f"Failed to delete instance {instance_id}: {e}")
        return error(
            f"Failed to delete instance: {str(e)}",
            code="INSTANCE_DELETE_ERROR",
            status_code=500,
        )
