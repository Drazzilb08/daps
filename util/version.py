import os
import subprocess
from pathlib import Path

BASE = Path(__file__).parents[1] / "VERSION"

def get_version() -> str:
    base = BASE.read_text().strip()
    ci_build = os.getenv("BUILD_NUMBER")
    ci_branch = os.getenv("BRANCH")
    if ci_build and ci_branch:
        return f"{base}.{ci_branch}{ci_build}"
    # If BUILD_NUMBER is set but BRANCH is not, fall through to git fallback.
    try:
        branch = (
            subprocess
            .check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL)
            .decode()
            .strip()
        )
        cnt = (
            subprocess
            .check_output(["git", "rev-list", "--count", "HEAD"], stderr=subprocess.DEVNULL)
            .decode()
            .strip()
        )
        return f"{base}.{branch}{cnt}"
    except Exception:
        return base