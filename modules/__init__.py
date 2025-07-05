# modules/__init__.py

from .health_checkarr import main as health_checkarr_main
from .jduparr import main as jduparr_main
from .labelarr import main as labelarr_main
from .nohl import main as nohl_main
from .poster_renamerr import main as poster_renamerr_main
from .renameinatorr import main as renameinatorr_main
from .sync_gdrive import main as sync_gdrive_main
from .unmatched_assets import main as unmatched_assets_main
from .upgradinatorr import main as upgradinatorr_main

MODULES = {
    "poster_renamerr": poster_renamerr_main,
    "labelarr": labelarr_main,
    "health_checkarr": health_checkarr_main,
    "nohl": nohl_main,
    "renameinatorr": renameinatorr_main,
    "sync_gdrive": sync_gdrive_main,
    "upgradinatorr": upgradinatorr_main,
    "unmatched_assets": unmatched_assets_main,
    "jduparr": jduparr_main,
}
