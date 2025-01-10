# Written to make the process for executing the correct executable for the OS straightforward
from logging import Logger
from pathlib import Path
from typing import Union

from util.constants import ROOT, OsName, OS_NAME


class SyncFileGetter:
    def __init__(self, logger: Logger):
        self._logger = logger

    def get_sync_file(self) -> Union[Path, None]:
        if OS_NAME == OsName.DOCKER or OS_NAME == OsName.LINUX:
            return ROOT.joinpath("scripts/rclone.sh")
        else:
            self._logger.warning("Unsupported OS for getting sync file: %s" % OS_NAME)
            return None
