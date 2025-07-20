import os
import re
import subprocess
import threading
import time
from pathlib import Path

import requests

from util.notification import NotificationManager

BASE = Path(__file__).parents[1] / "VERSION"


def get_version() -> str:
    """Get the version string based on environment variables or git information."""
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


def _check_remote_version(local_version, branch, logger):
    # Fetch remote VERSION file from GitHub
    raw_url = f"https://raw.githubusercontent.com/Drazzilb08/daps/{branch}/VERSION"
    try:
        remote_version = requests.get(raw_url, timeout=5)
        if not remote_version.ok:
            logger.debug(
                f"Could not fetch remote VERSION: {remote_version.status_code}"
            )
            return None, None, False
        remote_version_str = remote_version.text.strip()
    except Exception as e:
        logger.debug(f"Exception fetching VERSION: {e}")
        return None, None, False

    # Get remote build number (commit count)
    api_url = (
        f"https://api.github.com/repos/Drazzilb08/daps/commits?sha={branch}&per_page=1"
    )
    try:
        resp = requests.get(api_url, timeout=5)
        if not resp.ok:
            logger.debug(f"Could not fetch commit count: {resp.status_code}")
            return remote_version_str, None, False
        link = resp.headers.get("Link")
        if not link:
            build_count = 1
        else:
            match = re.search(r"&page=(\d+)>; rel=\"last\"", link)
            build_count = int(match.group(1)) if match else 1
    except Exception as e:
        logger.debug(f"Exception fetching build count: {e}")
        return remote_version_str, None, False

    # Construct remote full version
    remote_full = f"{remote_version_str}.{branch}{build_count}"

    # Compare (mimic your JS logic)
    update_available = False
    local_parts = local_version.strip().split(".")
    if len(local_parts) >= 4:
        local_base = ".".join(local_parts[:3])
        local_branch_build = local_parts[3]
        m = re.match(r"([a-zA-Z]+)(\d+)", local_branch_build)
        if m:
            local_branch = m.group(1)
            local_build = int(m.group(2))
        else:
            local_branch = local_branch_build.rstrip("0123456789")
            local_build = int(local_branch_build[len(local_branch) :] or 0)
        if remote_version_str == local_base and build_count > local_build:
            update_available = True
        elif remote_version_str != local_base:
            update_available = True
    return remote_full, build_count, update_available


def start_version_check(config, logger, interval=3600):
    """Starts a background thread to check for version updates."""

    def poll():
        local_version = get_version()
        local_parts = local_version.strip().split(".")
        if len(local_parts) < 4:
            return
        branch_and_build = local_parts[3]
        m = re.match(r"([a-zA-Z]+)", branch_and_build)
        branch = m.group(1) if m else "main"
        logger.info(f"[VERSION CHECK] Local version: {local_version}, branch: {branch}")

        while True:
            remote_full, build_count, update_available = _check_remote_version(
                local_version, branch, logger
            )
            if update_available:
                logger.debug(
                    f"[VERSION CHECK] Update available. Local: {local_version}, Remote: {remote_full}, Build Count: {build_count}"
                )
                output = {
                    "local_version": local_version,
                    "remote_version": remote_full,
                    "color": "FF0000",
                }
                config.module_name = "version_check"
                manager = NotificationManager(
                    config, logger, module_name="version_check"
                )
                manager.send_notification(output)
            else:
                logger.debug(
                    f"[VERSION CHECK] No update. Local: {local_version}, Remote: {remote_full}"
                )
            time.sleep(interval)

    thread = threading.Thread(target=poll, daemon=True)
    thread.start()
