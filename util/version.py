import os
import subprocess
from pathlib import Path

BASE = Path(__file__).parents[1] / "VERSION"

def get_version() -> str:
    base = BASE.read_text().strip()
    # 1) Try CI env var
    ci_build = os.getenv("BUILD_NUMBER")
    if ci_build:
        return f"{base}.build{ci_build}"
    # 2) Fallback to git commit count
    try:
        cnt = (
            subprocess
            .check_output(["git", "rev-list", "--count", "HEAD"], stderr=subprocess.DEVNULL)
            .decode()
            .strip()
        )
        return f"{base}.dev{cnt}"
    except Exception:
        return base