# util/module_runner.py
import multiprocessing
import time
from typing import Dict, Optional

from modules import MODULES
from util.database import DapsDB
from util.logger import Logger


def run_module_cli(module_class, module_name: str) -> None:
    """Simple module execution for CLI runs - no database tracking, no shared logger."""
    try:
        mod = module_class()
        mod.run()
        print(f"Module '{module_name}' completed successfully")
    except Exception as e:
        print(f"[ERROR] Module '{module_name}' failed: {e}")
        raise


def run_module_tracked(module_class, module_name, origin, logger):
    """Module execution with database tracking for scheduled/web runs."""
    with DapsDB(logger=logger) as db:
        start_time = time.monotonic()
        success = False
        message = ""
        try:
            mod = module_class(logger=logger)
            mod.run()
            success = True
            status = "success"
            message = "Completed successfully"
        except Exception as e:
            status = "error"
            message = str(e)
        duration = int(time.monotonic() - start_time)
        db.run_state.record_run_finish(
            module_name,
            success=success,
            status=status,
            message=message,
            duration=duration,
            run_by=origin,
        )


class ModuleRunner:

    def __init__(self, logger: Logger) -> None:
        self.logger = logger
        self.running: Dict[str, Dict] = {}

    def _log(
        self, level: str, msg: str, source: str = "runner", exc_info: bool = False
    ) -> None:
        if self.logger:
            adapter = self.logger.get_adapter(source)
            log_func = getattr(adapter, level, None)
            if log_func:
                log_func(msg, exc_info=exc_info)
            else:
                print(f"[{source.upper()}] {msg}")
        else:
            print(f"[{source.upper()}] {msg}")

    def run_modules_cli(self, modules: list[str]) -> None:
        self._log("info", f"CLI mode: Running modules {modules}", source="cli")
        try:
            processes = []
            for name in modules:
                proc = self._launch_cli_module(name)
                if proc:
                    processes.append(proc)

            for proc in processes:
                proc.join()

            self._log("info", "All CLI modules completed.", source="cli")
        except Exception as e:
            self._log(
                "error", f"Error in run_modules_cli: {e}", source="cli", exc_info=True
            )
            raise

    def launch_module_tracked(self, name: str, origin: str) -> Optional[Dict]:
        """Launch a module with database tracking"""
        try:
            if name not in MODULES:
                self._log("error", f"Unknown module: {name}", source=origin)
                return None

            module_class = MODULES[name]
            self._log("info", f"Launching tracked module '{name}'...", source=origin)

            with DapsDB(self.logger) as database:
                database.run_state.record_run_start(name, run_by=origin)

            proc = multiprocessing.Process(
                target=run_module_tracked,
                args=(module_class, name, origin, self.logger),
            )
            proc.start()

            self._log(
                "info",
                f"Process for tracked module '{name}' started: alive={proc.is_alive()}",
                source=origin,
            )

            self.running[name] = {"proc": proc, "origin": origin}
            return self.running[name]

        except Exception as e:
            self._log(
                "error",
                f"Failed to launch tracked module '{name}': {e}",
                source=origin,
                exc_info=True,
            )
            return None

    def _launch_cli_module(self, name: str) -> Optional[multiprocessing.Process]:
        try:
            if name not in MODULES:
                self._log("error", f"Unknown module: {name}", source="cli")
                return None

            module_class = MODULES[name]
            self._log("info", f"Launching CLI module '{name}'...", source="cli")

            proc = multiprocessing.Process(
                target=run_module_cli,
                args=(module_class, name),
            )
            proc.start()
            self._log(
                "info",
                f"Process for CLI module '{name}' started: alive={proc.is_alive()}",
                source="cli",
            )
            return proc
        except Exception as e:
            self._log(
                "error",
                f"Failed to launch CLI module '{name}': {e}",
                source="cli",
                exc_info=True,
            )
            return None

    def stop_all(self) -> None:
        """Stop all running processes"""
        for name, entry in list(self.running.items()):
            if entry and entry.get("proc") and entry["proc"].is_alive():
                try:
                    self._log("info", f"Terminating process {name}", source="runner")
                    entry["proc"].terminate()
                    entry["proc"].join(timeout=3)
                    if entry["proc"].is_alive():
                        entry["proc"].kill()
                        entry["proc"].join(timeout=1)
                except Exception as e:
                    self._log(
                        "warning",
                        f"Error stopping process {name}: {e}",
                        source="runner",
                    )
                finally:
                    del self.running[name]

    def get_running(self) -> Dict[str, Dict]:
        """Return dict of running module names -> {'proc': proc, 'origin': ...}"""
        return self.running.copy()

    def cleanup_finished(self) -> None:
        """Clean up finished processes"""
        for name in list(self.running):
            entry = self.running[name]
            proc = entry["proc"]
            origin = entry["origin"]
            if proc is not None and not proc.is_alive():
                self._log(
                    "info", f"Module {name} finished (origin={origin})", source="runner"
                )
                del self.running[name]
