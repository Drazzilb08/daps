# util/module_runner.py
import multiprocessing
import time
from typing import Dict

from modules import MODULES
from util.config import DapsConfig
from util.database import DapsDB


def run_module_cli(module_class, module_name, config):
    """Simple module execution for CLI runs - no database tracking."""
    try:
        mod = module_class()
        mod.run()
        print(f"Module '{module_name}' completed successfully")
    except Exception as e:
        print(f"[ERROR] Module '{module_name}' failed: {e}")
        raise


def run_module_tracked(module_class, module_name, origin, config, logger):
    """Module execution with database tracking for scheduled/web runs."""
    with DapsDB(logger=logger) as db:
        start_time = time.monotonic()
        success = False
        message = ""
        try:
            mod = module_class(logger=logger, config=config)
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
    """Pure module execution - no lifecycle management"""

    def __init__(self, logger, config: DapsConfig = None):
        self.logger = logger
        self.config = config
        self.running: Dict[str, Dict] = {}

    def _log(self, level, msg, source="runner", exc_info=False, **kwargs):
        """Unified logging method with fallback to print"""
        if self.logger:
            adapter = self.logger.get_adapter(source)
            log_func = getattr(adapter, level, None)
            if log_func:
                log_func(msg, exc_info=exc_info, **kwargs)
            else:
                print(f"[{source.upper()}] {msg}")
        else:
            print(f"[{source.upper()}] {msg}")

    def run_modules_cli(self, modules):
        """Run modules in CLI mode - simple execution without tracking"""
        self._log("info", f"CLI mode: Running modules {modules}", source="cli")
        try:
            from util.config import load_config

            full_config = self.config or load_config()

            processes = []
            for name in modules:
                proc = self._launch_cli_module(name, full_config)
                if proc:
                    processes.append(proc)

            # Wait for all processes to complete
            for proc in processes:
                proc.join()

            self._log("info", "All CLI modules completed.", source="cli")
        except Exception as e:
            self._log(
                "error", f"Error in run_modules_cli: {e}", source="cli", exc_info=True
            )
            raise

    def launch_module_tracked(self, name, origin):
        """Launch a module with database tracking"""
        try:
            if name not in MODULES:
                self._log("error", f"Unknown module: {name}", source=origin)
                return None

            module_class = MODULES[name]
            self._log("info", f"Launching tracked module '{name}'...", source=origin)

            # Record run start in database
            with DapsDB(self.logger) as database:
                database.run_state.record_run_start(name, run_by=origin)

            from util.config import load_config

            full_config = self.config or load_config()

            proc = multiprocessing.Process(
                target=run_module_tracked,
                args=(module_class, name, origin, full_config, self.logger),
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
            import traceback

            self._log(
                "error",
                f"Failed to launch tracked module '{name}': {e}",
                source=origin,
                exc_info=True,
            )
            traceback.print_exc()
            return None

    def _launch_cli_module(self, name, config):
        """Launch a module for CLI execution - no database tracking"""
        try:
            if name not in MODULES:
                self._log("error", f"Unknown module: {name}", source="cli")
                return None

            module_class = MODULES[name]
            self._log("info", f"Launching CLI module '{name}'...", source="cli")

            proc = multiprocessing.Process(
                target=run_module_cli,
                args=(module_class, name, config),
            )
            proc.start()
            self._log(
                "info",
                f"Process for CLI module '{name}' started: alive={proc.is_alive()}",
                source="cli",
            )
            return proc
        except Exception as e:
            import traceback

            self._log(
                "error",
                f"Failed to launch CLI module '{name}': {e}",
                source="cli",
                exc_info=True,
            )
            traceback.print_exc()
            return None

    def stop_all(self):
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

    def get_running(self):
        """Return dict of running module names -> {'proc': proc, 'origin': ...}"""
        return self.running.copy()

    def cleanup_finished(self):
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

    # Backward compatibility methods for existing web API
    def launch_module(self, name, origin="manual"):
        """Public method for web UI to launch modules - with database tracking."""
        # This would need a database instance - should be called from main with proper DB
        # For now, create a temporary DB connection (not ideal but maintains compatibility)
        try:
            with DapsDB(logger=self.logger) as db:
                return self.launch_module_tracked(name, origin, db)
        except Exception as e:
            self._log(
                "error",
                f"Failed to launch module '{name}': {e}",
                source="web",
                exc_info=True,
            )
            return None

    def get_running_legacy(self):
        """Legacy method name for backward compatibility"""
        return self.get_running()


# Legacy class name for backward compatibility
class DapsOrchestrator(ModuleRunner):
    """Legacy class name - use ModuleRunner instead"""

    def __init__(self, logger, config: DapsConfig = None):
        super().__init__(logger, config)
        if logger:
            logger.get_adapter("orchestrator").warning(
                "DapsOrchestrator is deprecated, use ModuleRunner instead"
            )

    def run(self, args):
        """Legacy run method for backward compatibility"""
        if args.modules:
            self.run_modules_cli(args.modules)
        else:
            self._log(
                "error",
                "Application mode should be handled by main.py, not orchestrator",
                source="orchestrator",
            )
            raise RuntimeError("Use main.py for application mode")

    def run_cli_modules(self, modules):
        """Legacy method name"""
        return self.run_modules_cli(modules)
