"""
Webhook processing API endpoints for DAPS.

Provides webhook handling for automated poster processing,
media event notifications, and external service integrations.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from backend.api.utils import error, get_database, get_logger, ok
from backend.util.database import DapsDB

router = APIRouter(
    prefix="/api/webhooks",
    tags=["Webhooks"],
    responses={
        500: {"description": "Internal server error"},
        400: {"description": "Invalid webhook payload"},
    },
)


def get_webhook_logger(request: Request) -> Any:
    """Get webhook-specific logger adapter from app state."""
    return request.app.state.logger.get_adapter("WEBHOOK")


@router.post(
    "/poster/add",
    summary="Process poster webhook",
    description="Handle webhook events for automated poster renaming and upload processing.",
    responses={
        200: {
            "description": "Webhook processed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Webhook enqueued for processing",
                        "data": {"job_id": 123, "status": "enqueued"},
                    }
                }
            },
        },
        400: {"description": "Invalid webhook payload or processing error"},
    },
)
async def process_poster_webhook(
    request: Request,
    logger: Any = Depends(get_webhook_logger),
    db: DapsDB = Depends(get_database),
) -> JSONResponse:
    """
    Process webhook events for automated poster management.

    Handles webhook events from external services (like Radarr/Sonarr)
    for automated poster renaming and upload processing. Creates
    background jobs for the ADHOC poster processing workflow.

    The webhook payload is analyzed to extract media information
    and trigger appropriate poster processing operations.

    Returns:
        Job ID for tracking webhook processing status
    """
    try:
        logger.debug("Serving POST /api/webhooks/poster/add")

        # Extract client information for logging and debugging
        client_info = {
            "client_host": request.client.host if request.client else None,
            "client_port": request.headers.get("X-Service-Port"),
            "headers": dict(request.headers),
            "scheme": getattr(request.url, "scheme", "http"),
        }

        # Parse webhook payload
        data = await request.json()

        # Check for test events and handle them specially
        if _is_test_event(data):
            logger.info(
                f"Test event received from {client_info['scheme']}://{client_info['client_host']}:{client_info['client_port']}"
            )
            return ok(
                "Test webhook received successfully",
                {"event_type": "test"},
            )

        # Create job payload with webhook data and client info
        job_data = {"webhook_data": data, "client_info": client_info}

        # Enqueue webhook processing job
        result = db.worker.enqueue_job("jobs", job_data, job_type="webhook")

        if not result.get("success"):
            logger.error(f"Error persisting webhook: {result.get('message')}")
            return error(
                f"Error enqueuing webhook: {result.get('message', 'Unknown error')}",
                code="WEBHOOK_ENQUEUE_ERROR",
                status_code=result.get("status", 500),
            )

        job_id = result.get("data", {}).get("job_id")
        logger.info(f"Webhook job enqueued - processing job ID: {job_id}")

        return ok(
            "Webhook enqueued for processing",
            {"job_id": job_id, "status": "enqueued"},
        )

    except Exception as e:
        logger.error(f"Exception in webhook processing: {e}", exc_info=True)
        return error(
            f"Webhook processing error: {str(e)}",
            code="WEBHOOK_PROCESSING_ERROR",
            status_code=500,
        )


def _is_test_event(data: Dict[str, Any]) -> bool:
    """
    Check if webhook data represents a test event.

    Analyzes the webhook payload to determine if it's a test
    event sent by external services for connectivity validation.

    Args:
        data: Webhook payload data

    Returns:
        True if this is a test event, False otherwise
    """
    event_type = data.get("eventType", "")
    return isinstance(event_type, str) and "test" in event_type.lower()


# Placeholder endpoints for future webhook integrations
@router.get(
    "/unmatched/status",
    summary="Get unmatched assets webhook status",
    description="Retrieve status information for unmatched assets webhook processing.",
    responses={
        200: {
            "description": "Unmatched assets webhook status retrieved",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Unmatched assets webhook status - not yet implemented",
                        "data": {"status": "not_implemented"},
                    }
                }
            },
        }
    },
)
async def get_unmatched_webhook_status(
    logger: Any = Depends(get_logger),
) -> JSONResponse:
    """
    Retrieve status for unmatched assets webhook processing.

    Future implementation will provide status information about
    unmatched assets webhook events and processing queue.

    Returns:
        Status information for unmatched assets webhooks
    """
    return ok(
        "Unmatched assets webhook status - not yet implemented",
        {"status": "not_implemented"},
    )


@router.post(
    "/unmatched/process",
    summary="Process unmatched assets webhook",
    description="Handle webhook events for unmatched assets processing.",
    responses={
        200: {
            "description": "Unmatched assets webhook processing initiated",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Unmatched assets webhook processing - not yet implemented",
                        "data": {"status": "not_implemented"},
                    }
                }
            },
        }
    },
)
async def process_unmatched_webhook(logger: Any = Depends(get_logger)) -> JSONResponse:
    """
    Process webhook events for unmatched assets.

    Future implementation will handle webhook events related to
    unmatched poster assets and trigger appropriate processing.

    Returns:
        Processing status for unmatched assets webhook
    """
    return ok(
        "Unmatched assets webhook processing - not yet implemented",
        {"status": "not_implemented"},
    )


@router.get(
    "/cleanarr/status",
    summary="Get Cleanarr webhook status",
    description="Retrieve status information for Cleanarr webhook processing.",
    responses={
        200: {
            "description": "Cleanarr webhook status retrieved",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Cleanarr webhook status - not yet implemented",
                        "data": {"status": "not_implemented"},
                    }
                }
            },
        }
    },
)
async def get_cleanarr_webhook_status(
    logger: Any = Depends(get_logger),
) -> JSONResponse:
    """
    Retrieve status for Cleanarr webhook processing.

    Future implementation will provide status information about
    Cleanarr webhook events and media cleanup operations.

    Returns:
        Status information for Cleanarr webhooks
    """
    return ok(
        "Cleanarr webhook status - not yet implemented",
        {"status": "not_implemented"},
    )


@router.post(
    "/cleanarr/process",
    summary="Process Cleanarr webhook",
    description="Handle webhook events for Cleanarr media cleanup operations.",
    responses={
        200: {
            "description": "Cleanarr webhook processing initiated",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Cleanarr webhook processing - not yet implemented",
                        "data": {"status": "not_implemented"},
                    }
                }
            },
        }
    },
)
async def process_cleanarr_webhook(logger: Any = Depends(get_logger)) -> JSONResponse:
    """
    Process webhook events for Cleanarr operations.

    Future implementation will handle webhook events related to
    media cleanup and library maintenance operations.

    Returns:
        Processing status for Cleanarr webhook
    """
    return ok(
        "Cleanarr webhook processing - not yet implemented",
        {"status": "not_implemented"},
    )
