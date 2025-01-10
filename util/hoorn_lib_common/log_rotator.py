# Written by Mr. Hoorn to fix the weird and problematic log rotation logic in the original code.
# Inspired by the FileHoornLogOutput of Mr. Hoorn's common library.
# See: https://github.com/LordMartron94/py-common/blob/main/py_common/logging/output/file_hoorn_log_output.py
import os
from pathlib import Path
from sys import path_hooks
from typing import List, Dict, Tuple

from util.hoorn_lib_common.file_handler import FileHandler


class LogRotator:
    def __init__(self, log_directory: Path, max_logs_to_keep: int = 3, create_directory: bool = True):
        """
        Rotates logs around based on the max logs to keep.

        :param log_directory: The base directory for logs.
        :param max_logs_to_keep: The max number of logs to keep (per directory).
        :param create_directory: Whether to initialize the creation of log directories if they don't exist.
        """

        self._file_handler: FileHandler = FileHandler()

        self._root_log_directory: Path = log_directory
        self._max_logs_to_keep: int = max_logs_to_keep

        self._validate_directory(self._root_log_directory, create_directory)

    def _validate_directory(self, directory: Path, create_directory: bool):
        if not directory.exists():
            if create_directory:
                directory.mkdir(parents=True, exist_ok=True)
                return

            raise FileNotFoundError(f"Log directory {directory} does not exist")

    def increment_logs(self) -> None:
        """
        Increments the log number by 1 and removes old logs if necessary.

        :return: None
        """

        children = self._file_handler.get_children_paths(self._root_log_directory, ".txt", recursive=True)

        # Map file_paths to associated numbers
        matched: List[Tuple[Path, int]] = [(path, int(path.stem.split("_")[1])) for path in children]

        # Sort by number in reverse
        matched.sort(key=lambda x: x[1], reverse=True)

        self._increment_logs_in_directory(matched)

    def _increment_logs_in_directory(self, matched_logs: List[Tuple[Path, int]]) -> None:
        for i in range(len(matched_logs)):
            path = matched_logs[i][0]
            number = matched_logs[i][1]
            if number + 1 > self._max_logs_to_keep:
                os.remove(path)
                continue

            os.rename(path, Path.joinpath(path.parent.absolute(), f"log_{number + 1}.txt"))

    def _organize_logs_by_subdirectory(self, log_paths: List[Path]) -> List[List[Path]]:
        """
        Organizes a list of log file paths into a list of lists,
        where each sublist contains logs from the same subdirectory.

        Args:
          log_paths: A list of WindowsPath objects representing log file paths.

        Returns:
          A list of lists, where each sublist contains log paths from the same subdirectory.
        """
        log_groups = {}
        for log_path in log_paths:
            parent_dir = log_path.parent.name
            if parent_dir not in log_groups:
                log_groups[parent_dir] = []
            log_groups[parent_dir].append(log_path)
        return list(log_groups.values())

    def get_log_file(self) -> str:
        return f"{self._root_log_directory}/log_0.txt"
