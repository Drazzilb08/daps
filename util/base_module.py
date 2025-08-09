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
        """
        Return this module's registry key from modules.MODULES.

        Raises:
            LookupError: if this class is not registered in the MODULES mapping.
            TypeError: if the MODULES registry is not a dict-like mapping.
        """
        from modules import MODULES

        # Validate registry is dict-like
        try:
            items = MODULES.items()
        except Exception as e:
            raise TypeError(f"Invalid MODULES registry: {e}")

        for module_name, module_class in items:
            # Exact class match only to avoid ambiguity
            if module_class is self.__class__ or module_class == self.__class__:
                return module_name

        # Nothing matched: make the error explicit and actionable
        raise LookupError(
            f"{self.__class__.__name__} is not registered in modules.MODULES; "
            "add it to modules/__init__.py: MODULES['<key>'] = <Class>"
        )

    @abstractmethod
    def run(self) -> None:
        pass
