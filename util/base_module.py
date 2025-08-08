# util/base_module.py

from abc import ABC, abstractmethod

from util.config import load_config
from util.logger import Logger


class DapsModule(ABC):
    def __init__(self) -> None:
        self.full_config = load_config()
        try:
            module_name = self._get_module_name()
        except Exception as e:
            raise ValueError(f"Failed to determine module name: {e}")

        self.config = getattr(self.full_config, module_name, None)

        if self.config is None:
            raise ValueError(f"No configuration found for module: {module_name}")

        # Create module-specific logger with its own log file
        log_level = getattr(self.config, "log_level", "INFO")
        self.logger = Logger(log_level=log_level, module_name=module_name)

    def _get_module_name(self) -> str:
        from modules import MODULES

        for module_name, module_class in MODULES.items():
            if module_class == self.__class__:
                return module_name

    @abstractmethod
    def run(self) -> None:
        pass
