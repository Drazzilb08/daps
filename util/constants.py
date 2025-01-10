import os
import platform
from enum import Enum
from pathlib import Path

ROOT: Path = Path(os.path.dirname(__file__)).parent

def get_os_type():
    """Returns the operating system type."""

    return platform.system()


class OsName(Enum):
    DOCKER = "docker",
    WINDOWS = "windows"
    LINUX = "linux"
    MACOS = "mac"

if os.environ.get('DOCKER_ENV'):
    DOCKER_ENV: bool = True
    OS_NAME = OsName.DOCKER
else:
    DOCKER_ENV = False
    os_name = get_os_type()

    if os_name == 'Windows':
        OS_NAME = OsName.WINDOWS
    elif os_name == 'Darwin':
        OS_NAME = OsName.MACOS
    elif os_name == 'Linux':
        OS_NAME = OsName.LINUX
    else:
        print("WARNING: Unsupported File System")
