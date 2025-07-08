# New test file content for `test_main.py`
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import time
from multiprocessing import Process

import pytest

from main import ScriptManager


class DummyLogger:
    def __init__(self):
        self.logs = []

    def info(self, msg): self.logs.append(f"INFO: {msg}")
    def debug(self, msg): self.logs.append(f"DEBUG: {msg}")
    def warning(self, msg): self.logs.append(f"WARNING: {msg}")
    def error(self, msg): self.logs.append(f"ERROR: {msg}")

def dummy_script():
    time.sleep(1)

def dummy_run_module(script_name, logger):
    return Process(target=dummy_script)

def dummy_check_schedule(script_name, schedule_time, logger):
    return True

def test_script_manager_run_and_cleanup():
    logger = DummyLogger()
    manager = ScriptManager(logger)
    manager.run("dummy_script", dummy_run_module)

    assert "dummy_script" in manager.running_scripts
    assert manager.already_run["dummy_script"] is True

    time.sleep(1.5)
    manager.cleanup()

    assert "dummy_script" not in manager.running_scripts
    assert not manager.has_running_scripts()

def test_script_manager_run_if_due():
    logger = DummyLogger()
    manager = ScriptManager(logger)
    manager.run_if_due("dummy_script", "daily(10:00)", dummy_check_schedule, dummy_run_module)
    assert "dummy_script" in manager.running_scripts

