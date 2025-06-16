import os
import subprocess
from pathlib import Path

BASE = Path(__file__).parents[1] / "VERSION"


def get_version() -> str:
    """Get the version string based on environment variables or git information.

    Args:
      None

    Returns:
      str: The version string composed of the base version and build/branch info.
    """
    base_version = BASE.read_text().strip()
    ci_build = os.getenv("BUILD_NUMBER")
    ci_branch = os.getenv("BRANCH")
    if ci_build and ci_branch:
        return f"{base_version}.{ci_branch}{ci_build}"

    try:
        branch = (
            subprocess.check_output(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL
            )
            .decode()
            .strip()
        )
        commit_count = (
            subprocess.check_output(
                ["git", "rev-list", "--count", "HEAD"], stderr=subprocess.DEVNULL
            )
            .decode()
            .strip()
        )
        return f"{base_version}.{branch}{commit_count}"
    except Exception:
        return base_version
