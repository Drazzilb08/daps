# api/server.py
"""
Web server startup with proper dependency injection.
"""

import threading
from typing import TYPE_CHECKING

import uvicorn

if TYPE_CHECKING:
    from util.logger import Logger
    from util.module_runner import ModuleRunner


def start_web_server(logger: "Logger", module_runner: "ModuleRunner") -> None:
    """
    Start web server with proper dependency injection.

    Args:
        logger: Logger instance
        module_runner: ModuleRunner instance for handling module execution
    """

    def run_server():
        try:
            from api.main import app

            # FIXED: Inject dependencies into app state consistently
            app.state.logger = logger
            app.state.module_runner = module_runner  # Consistent naming

            # REMOVED: No more orchestrator reference for backward compatibility
            # This breaks the old API but enforces the new standardized pattern

            port = 8000  # Could be configurable via environment or config
            host = "0.0.0.0"

            logger.get_adapter("SERVER").info(f"Starting web server on {host}:{port}")

            uvicorn.run(
                app,
                host=host,
                port=port,
                log_config=None,  # Disable uvicorn logging
                access_log=False,  # Disable access logging
            )
        except Exception as e:
            logger.get_adapter("SERVER").error(f"Web server error: {e}", exc_info=True)
            raise

    # Start server in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
