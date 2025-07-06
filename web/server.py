import os
from threading import Thread
from typing import Any

import uvicorn

from web.api.main import app

def start_web_server(logger: Any, orchestrator=None) -> None:
    """
    Starts the web server in a background thread and stores logger in app state.
    Args:
      logger: Logger instance to use for the app.
      orchestrator: Optional orchestrator instance to store in app state.
    """
    app.state.logger = logger
    if orchestrator is not None:
        app.state.orchestrator = orchestrator

    PORT = int(os.environ.get("PORT", 8000))
    HOST = os.environ.get("HOST", "0.0.0.0")
    logger.info(f"[WEB] Starting web server on {HOST}:{PORT}")
    web_thread = Thread(
        target=lambda: uvicorn.run(app, host=HOST, port=PORT, log_level="warning"),
        daemon=True,
    )
    web_thread.start()