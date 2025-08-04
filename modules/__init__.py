# modules/__init__.py

from .health_checkarr import HealthCheckarr
from .jduparr import Jduparr
from .labelarr import Labelarr
from .nohl import Nohl
from .poster_renamerr import PosterRenamerr
from .renameinatorr import Renameinatorr
from .sync_gdrive import SyncGDrive
from .unmatched_assets import UnmatchedAssets
from .upgradinatorr import Upgradinatorr

MODULES = {
    "poster_renamerr": PosterRenamerr,
    "labelarr": Labelarr,
    "health_checkarr": HealthCheckarr,
    "nohl": Nohl,
    "renameinatorr": Renameinatorr,
    "sync_gdrive": SyncGDrive,
    "upgradinatorr": Upgradinatorr,
    "unmatched_assets": UnmatchedAssets,
    "jduparr": Jduparr,
}
