import os
import threading
import time
from typing import Any, Optional

import uvicorn

from api.main import app

# Global reference to the web server thread for cleanup
_web_thread: Optional[threading.Thread] = None
_server_config = None


def start_web_server(logger: Any, orchestrator=None) -> None:
    """
    Starts the web server in a background thread and stores logger in app state.
    Args:
      logger: Logger instance to use for the app.
      orchestrator: Optional orchestrator instance to store in app state.
    """
    global _web_thread, _server_config

    app.state.logger = logger
    log = logger.get_adapter("web")

    if orchestrator is not None:
        app.state.orchestrator = orchestrator

    PORT = int(os.environ.get("PORT", 8000))
    HOST = os.environ.get("HOST", "0.0.0.0")

    log.info(f"Starting web server on {HOST}:{PORT}")

    # Store server config for potential cleanup
    _server_config = {"host": HOST, "port": PORT}

    def run_server():
        """Run uvicorn server with proper error handling"""
        try:
            log.debug("Starting uvicorn server...")
            uvicorn.run(
                app,
                host=HOST,
                port=PORT,
                log_level="warning",
                access_log=False,  # Reduce log noise
                # These help with shutdown
                loop="asyncio",
                # Don't use reload in production
                reload=False,
            )
        except Exception as e:
            log.error(f"Web server error: {e}", exc_info=True)
        finally:
            log.debug("Web server thread ending")

    # Create thread as non-daemon so it can be properly joined
    _web_thread = threading.Thread(
        target=run_server,
        name="WebServer",
        daemon=False,  # Changed from True to False for better shutdown control
    )
    _web_thread.start()

    # Give the server a moment to start
    time.sleep(1)

    if _web_thread.is_alive():
        log.info(f"Web server started on {HOST}:{PORT}")
    else:
        log.error("Failed to start web server thread")


def stop_web_server(logger: Any = None, timeout: int = 10) -> bool:
    """
    Stop the web server gracefully.

    Args:
        logger: Logger instance for logging
        timeout: Maximum time to wait for shutdown

    Returns:
        bool: True if stopped successfully, False otherwise
    """
    global _web_thread, _server_config

    log = logger.get_adapter("web") if logger else None

    if not _web_thread or not _web_thread.is_alive():
        if log:
            log.info("Web server thread is not running")
        return True

    if log:
        log.info("Stopping web server...")

    try:
        # Unfortunately, uvicorn doesn't have a clean way to stop from outside
        # The FastAPI lifespan should handle the cleanup of resources

        # Wait for thread to finish (it should stop when main process exits)
        _web_thread.join(timeout=timeout)

        if _web_thread.is_alive():
            if log:
                log.warning(f"Web server thread did not stop within {timeout}s")
            return False
        else:
            if log:
                log.info("Web server stopped successfully")
            return True

    except Exception as e:
        if log:
            log.error(f"Error stopping web server: {e}", exc_info=True)
        return False
    finally:
        _web_thread = None
        _server_config = None


def is_web_server_running() -> bool:
    """Check if the web server thread is currently running"""
    global _web_thread
    return _web_thread is not None and _web_thread.is_alive()


def get_web_server_info() -> Optional[dict]:
    """Get information about the running web server"""
    global _web_thread, _server_config

    if not _web_thread or not _server_config:
        return None

    return {
        "thread_name": _web_thread.name,
        "is_alive": _web_thread.is_alive(),
        "host": _server_config.get("host"),
        "port": _server_config.get("port"),
    }
