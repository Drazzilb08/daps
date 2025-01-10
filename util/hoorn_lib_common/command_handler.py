# See: https://github.com/LordMartron94/py-common/blob/main/py_common/command_handling/command_helper.py
# Made for Windows specifically, MIGHT work on other OS, but untested.

import asyncio
import os
import shutil
import subprocess
from logging import Logger
from pathlib import Path
from typing import Union, List


class CommandHelper:
    """
    Helper class meant to streamline the execution of a command in command prompt. Enjoy.
    """

    def __init__(self, logger: Logger):
        """
        Initializes the command helper with the provided Logger and module separator.
        :param logger: Logger instance.
        """

        self._logger: Logger = logger

    def _format_error(self, stderr: str) -> str:
        formatted = "Error executing command:\n"

        for line in stderr.split('\n'):
            formatted += f"  {line}\n"

        return formatted

    def execute_command(self, command: list, output_override: bool = False) -> subprocess.CompletedProcess:
        """
        Executes a given command.
        Prints errors in all cases.
        """
        if output_override:
            self._logger.info(f"Executing command: {command}")
            self._logger.info(f"Stringified: {' '.join(command)}")

        result = subprocess.run(command, capture_output=True)
        if result.returncode != 0:
            error_message = self._format_error(result.stderr.decode('utf-8'))
            self._logger.error(error_message)
            self._logger.info(f"Command causing error: {command}")

        return result

    def execute_command_v2(self, executable: Union[Path, str], command: list, shell: bool, hide_console: bool = True, keep_open: bool = False) -> None:
        """Use this if `execute_command` does not work."""

        self._logger.debug(f"Executing {' '.join(command)} with executable {executable}")

        bat_file_path = Path(__file__).parent.joinpath("temp.bat")

        with open(bat_file_path, 'w') as bat_file:
            bat_file.write("@echo off\n")
            bat_file.write(f'"{executable}" {" ".join(command)}\n')

            if not keep_open:
                bat_file.write(f'exit\n')
            else: bat_file.write(f'pause\n')

        print(bat_file_path)

        if hide_console:
            subprocess.run(['start', '/b', os.environ["COMSPEC"], '/c', f"{bat_file_path}"], shell=shell)
            return

        subprocess.run(['start', os.environ["COMSPEC"], '/k', f"{bat_file_path}"], shell=shell)

    async def execute_command_v2_async(self, executable: Union[Path, str], command: list, hide_console: bool = True, keep_open: bool = False) -> None:
        """Use this if `execute_command` does not work. Async version."""

        self._logger.debug(f"Executing {' '.join(command)} with executable {executable}")

        bat_file_path = Path(__file__).parent.joinpath("temp.bat")

        executable_path = shutil.which(executable.name if type(executable) == Path else executable)

        with open(bat_file_path, 'w') as bat_file:
            bat_file.write(f'"{executable_path}" {" ".join(command)}\n')

            if not keep_open:
                bat_file.write(f'exit\n')
            else: bat_file.write(f'pause\nexit\n')

        print(bat_file_path)

        if hide_console:
            proc = await asyncio.create_subprocess_exec(
                os.environ["COMSPEC"],
                '/k',
                str(bat_file_path),
                shell=False
            )
            await proc.wait()
            return

        proc = await asyncio.create_subprocess_exec(
            os.environ["COMSPEC"],
            '/k',
            str(bat_file_path),
            shell=False
        )
        await proc.wait()
        return

    def open_python_module_with_custom_interpreter(self, interpreter_path: Path, working_directory: Path, module_name: str, args: list[str]):
        """
        Opens a python module with a custom interpreter.
        """

        self._logger.debug(f"Opening module {module_name} with interpreter {interpreter_path}")

        bat_file_path = Path(__file__).parent.joinpath("temp.bat")

        with open(bat_file_path, 'w') as bat_file:
            bat_file.write(f'cd "{working_directory}"\n')
            bat_file.write(f'"{interpreter_path}" -m {module_name} {" ".join(args)}\n')
            bat_file.write(f'pause\n')

        print(bat_file_path)
        subprocess.run(['start', os.environ["COMSPEC"], '/k', f"{bat_file_path}"], shell=True)

    def open_application(self, exe: Path, args: List[str], new_window: bool = True, keep_open: bool = False):
        """
        Opens an application with the provided arguments.
        """
        self._logger.info(f"Opening application {exe}")

        if new_window:
            creationflags = subprocess.CREATE_NEW_CONSOLE
        else:
            creationflags = 0

        try:
            if keep_open:
                # Add a command to pause execution and keep the window open
                args.append("&& pause")

            subprocess.Popen([str(exe)] + args, creationflags=creationflags)
        except PermissionError as e:
            self._logger.error(f"Permission denied to execute {exe}. Please ensure you have the necessary permissions.\n{e}")
        except Exception as e:
            self._logger.error(f"Error executing {exe}.\n{e}")