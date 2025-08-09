# modules/unmatched_assets.py

import sys
from typing import Any, Dict, List, Optional

from util.base_module import DapsModule
from util.database import DapsDB
from util.logger import Logger
from util.notification import NotificationManager


class UnmatchedAssets(DapsModule):
    def __init__(self, logger: Optional[Logger] = None) -> None:
        """
        Standard constructor using dependency injection.

        Args:
            config: Complete DAPS configuration object
            logger: Logger instance
        """
        super().__init__(logger)

        self.allowed_instances: set = set()
        self.plex_libraries: Dict[str, set] = {}

        self.unmatched_media: List[Dict] = []
        self.unmatched_collections: List[Dict] = []
        self.all_media: List[Dict] = []
        self.all_collections: List[Dict] = []

    def fetch_data(self, db: DapsDB) -> None:
        self.unmatched_media = db.media.get_unmatched()
        self.unmatched_collections = db.collection.get_unmatched()
        self.all_media = db.media.get_all()
        self.all_collections = db.collection.get_all()

    def compute_instance_filters(self) -> None:
        for inst in getattr(self.config, "instances", []):
            if isinstance(inst, str):
                self.allowed_instances.add(inst)
            elif isinstance(inst, dict):
                for instance_name, params in inst.items():
                    self.allowed_instances.add(instance_name)
                    libs = set(params.get("library_names", []))
                    if libs:
                        self.plex_libraries[instance_name] = libs

    def allowed_media(self, asset: Dict[str, Any]) -> bool:
        inst = asset.get("instance_name")
        return bool(inst and inst in self.allowed_instances)

    def allowed_collection(self, asset: Dict[str, Any]) -> bool:
        inst = asset.get("instance_name")
        lib = asset.get("library_name")
        if inst not in self.allowed_instances:
            return False
        if inst in self.plex_libraries:
            return lib in self.plex_libraries[inst]
        return True

    def filter_by_instance(self) -> None:
        self.unmatched_media = [
            a for a in self.unmatched_media if self.allowed_media(a)
        ]
        self.unmatched_collections = [
            a for a in self.unmatched_collections if self.allowed_collection(a)
        ]
        self.all_media = [a for a in self.all_media if self.allowed_media(a)]
        self.all_collections = [
            a for a in self.all_collections if self.allowed_collection(a)
        ]

    def should_include(self, asset: Dict[str, Any]) -> bool:
        cfg = self.config
        if (
            getattr(cfg, "ignore_folders", [])
            and asset.get("folder") in cfg.ignore_folders
        ):
            return False
        profile = asset.get("profile") or asset.get("quality_profile")
        if getattr(cfg, "ignore_profiles", []) and profile in cfg.ignore_profiles:
            return False
        tags = asset.get("tags", [])
        if isinstance(tags, str):
            import json

            try:
                tags = json.loads(tags)
            except Exception:
                tags = [t.strip() for t in tags.split(",") if t.strip()]
        if getattr(cfg, "ignore_tags", []):
            if any(tag in cfg.ignore_tags for tag in tags):
                return False
        if (
            getattr(cfg, "ignore_titles", [])
            and asset.get("title") in cfg.ignore_titles
        ):
            return False
        return True

    def filter_by_config(self) -> None:
        self.unmatched_media = [
            a for a in self.unmatched_media if self.should_include(a)
        ]
        self.unmatched_collections = [
            a for a in self.unmatched_collections if self.should_include(a)
        ]
        self.all_media = [a for a in self.all_media if self.should_include(a)]
        self.all_collections = [
            a for a in self.all_collections if self.should_include(a)
        ]

    def group_assets(self) -> tuple:
        group_map = {"movie": "movies", "show": "series", "series": "series"}
        unmatched = {"movies": [], "series": [], "collections": []}
        all_media_grouped = {"movies": [], "series": []}
        all_collections_grouped = []

        for row in self.unmatched_media:
            key = group_map.get(row.get("asset_type"))
            if not key:
                continue
            entry = dict(row)
            if key == "series":
                if entry.get("season_number") is not None:
                    found = next(
                        (
                            s
                            for s in unmatched["series"]
                            if s["title"] == entry["title"]
                            and s.get("year") == entry.get("year")
                        ),
                        None,
                    )
                    if found:
                        found.setdefault("missing_seasons", []).append(
                            entry["season_number"]
                        )
                    else:
                        unmatched["series"].append(
                            {
                                "title": entry["title"],
                                "year": entry.get("year"),
                                "missing_seasons": [entry["season_number"]],
                                "missing_main_poster": False,
                            }
                        )
                else:
                    found = next(
                        (
                            s
                            for s in unmatched["series"]
                            if s["title"] == entry["title"]
                            and s.get("year") == entry.get("year")
                        ),
                        None,
                    )
                    if found:
                        found["missing_main_poster"] = True
                    else:
                        unmatched["series"].append(
                            {
                                "title": entry["title"],
                                "year": entry.get("year"),
                                "missing_seasons": [],
                                "missing_main_poster": True,
                            }
                        )
            else:
                unmatched[key].append(entry)

        for row in self.unmatched_collections:
            unmatched["collections"].append(dict(row))

        for row in self.all_media:
            key = group_map.get(row.get("asset_type"))
            if not key:
                continue
            entry = dict(row)
            if key == "series":
                found = next(
                    (
                        s
                        for s in all_media_grouped["series"]
                        if s["title"] == entry["title"]
                        and s.get("year") == entry.get("year")
                    ),
                    None,
                )
                if found:
                    if entry.get("season_number") is not None:
                        found.setdefault("seasons", []).append(entry["season_number"])
                else:
                    seasons = []
                    if entry.get("season_number") is not None:
                        seasons = [entry["season_number"]]
                    all_media_grouped["series"].append(
                        {
                            "title": entry["title"],
                            "year": entry.get("year"),
                            "seasons": seasons,
                        }
                    )
            else:
                all_media_grouped[key].append(entry)

        for row in self.all_collections:
            all_collections_grouped.append(dict(row))

        return unmatched, all_media_grouped, all_collections_grouped

    def calculate_stats(
        self,
        unmatched: Dict[str, List],
        all_media_grouped: Dict[str, List],
        all_collections_grouped: List[Dict],
    ) -> Dict[str, Any]:
        """Calculate completion statistics"""
        unmatched_movies_total = len(unmatched["movies"])
        total_movies = len(all_media_grouped["movies"])
        percent_movies_complete = (
            ((total_movies - unmatched_movies_total) / total_movies * 100)
            if total_movies
            else 0
        )

        unmatched_series_total = sum(
            1 for item in unmatched["series"] if item.get("missing_main_poster", False)
        )
        total_series = len(all_media_grouped["series"])
        percent_series_complete = (
            ((total_series - unmatched_series_total) / total_series * 100)
            if total_series
            else 0
        )

        unmatched_seasons_total = sum(
            len(item.get("missing_seasons", [])) for item in unmatched["series"]
        )
        total_seasons = sum(
            len(item.get("seasons", [])) for item in all_media_grouped["series"]
        )
        percent_seasons_complete = (
            ((total_seasons - unmatched_seasons_total) / total_seasons * 100)
            if total_seasons
            else 0
        )

        unmatched_collections_total = len(unmatched["collections"])
        total_collections = len(all_collections_grouped)
        percent_collections_complete = (
            (
                (total_collections - unmatched_collections_total)
                / total_collections
                * 100
            )
            if total_collections
            else 0
        )

        grand_total = total_movies + total_series + total_seasons + total_collections
        grand_unmatched = (
            unmatched_movies_total
            + unmatched_series_total
            + unmatched_seasons_total
            + unmatched_collections_total
        )
        percent_grand_complete = (
            ((grand_total - grand_unmatched) / grand_total * 100) if grand_total else 0
        )

        summary = {
            "movies": {
                "total": total_movies,
                "unmatched": unmatched_movies_total,
                "percent_complete": percent_movies_complete,
            },
            "series": {
                "total": total_series,
                "unmatched": unmatched_series_total,
                "percent_complete": percent_series_complete,
            },
            "seasons": {
                "total": total_seasons,
                "unmatched": unmatched_seasons_total,
                "percent_complete": percent_seasons_complete,
            },
            "collections": {
                "total": total_collections,
                "unmatched": unmatched_collections_total,
                "percent_complete": percent_collections_complete,
            },
            "grand_total": {
                "total": grand_total,
                "unmatched": grand_unmatched,
                "percent_complete": percent_grand_complete,
            },
        }
        return summary

    def get_stats_adhoc(self) -> Dict[str, Any]:
        try:
            with DapsDB(logger=self.logger) as db:
                return self.get_stats(db)
        except Exception as exc:
            self.logger.error(f"\n\nAn error occurred: {exc}\n", exc_info=True)
            return {}

    def get_stats(self, db: DapsDB) -> Dict[str, Any]:
        self.fetch_data(db)

        self.compute_instance_filters()
        if not self.allowed_instances:
            all_instance_names = {
                asset.get("instance_name")
                for asset in self.unmatched_collections
                + self.all_collections
                + self.unmatched_media
                + self.all_media
            }
            self.allowed_instances = all_instance_names
            self.logger.debug(
                f"Allowed_instances defaulted to: {self.allowed_instances}"
            )

        self.filter_by_instance()
        self.filter_by_config()
        unmatched, all_media_grouped, all_collections_grouped = self.group_assets()
        summary = self.calculate_stats(
            unmatched, all_media_grouped, all_collections_grouped
        )
        return {
            "unmatched": unmatched,
            "all_media": all_media_grouped,
            "all_collections": all_collections_grouped,
            "summary": summary,
        }

    def print_stats(self, db: DapsDB) -> None:
        try:
            from util.helper import create_table

            stats = self.get_stats(db)
            unmatched = stats["unmatched"]
            summary = stats["summary"]
            asset_types = ["movies", "series", "collections"]

            for asset_type in asset_types:
                data_set = unmatched.get(asset_type, [])
                if data_set:
                    table = [[f"Unmatched {asset_type.capitalize()}"]]
                    self.logger.info(create_table(table))
                    for idx, item in enumerate(data_set):
                        if idx % 10 == 0:
                            self.logger.info(
                                f"\t*** {asset_type.title()} {idx + 1} - {min(idx + 10, len(data_set))} ***"
                            )
                            self.logger.info("")
                        if asset_type == "series":
                            title = item.get("title", "Unknown")
                            year = item.get("year", "")
                            missing_seasons = item.get("missing_seasons", [])
                            missing_main = item.get("missing_main_poster", False)
                            if missing_seasons and missing_main:
                                self.logger.info(f"\t{title} ({year})")
                                for season in missing_seasons:
                                    self.logger.info(f"\t\tSeason: {season}")
                            elif missing_seasons:
                                self.logger.info(
                                    f"\t{title} ({year}) (Seasons listed below have missing posters)"
                                )
                                for season in missing_seasons:
                                    self.logger.info(f"\t\tSeason: {season}")
                            elif missing_main:
                                self.logger.info(
                                    f"\t{title} ({year})  Main series poster missing"
                                )
                        else:
                            year = f" ({item.get('year')})" if item.get("year") else ""
                            self.logger.info(f"\t{item.get('title')}{year}")
                        self.logger.info("")
                    self.logger.info("")

            self.logger.info("")
            self.logger.info(create_table([["Statistics"]]))
            table = [
                ["Type", "Total", "Unmatched", "Percent Complete"],
                [
                    "Movies",
                    summary["movies"]["total"],
                    summary["movies"]["unmatched"],
                    f"{summary['movies']['percent_complete']:.2f}%",
                ],
                [
                    "Series",
                    summary["series"]["total"],
                    summary["series"]["unmatched"],
                    f"{summary['series']['percent_complete']:.2f}%",
                ],
                [
                    "Seasons",
                    summary["seasons"]["total"],
                    summary["seasons"]["unmatched"],
                    f"{summary['seasons']['percent_complete']:.2f}%",
                ],
                [
                    "Collections",
                    summary["collections"]["total"],
                    summary["collections"]["unmatched"],
                    f"{summary['collections']['percent_complete']:.2f}%",
                ],
                [
                    "Grand Total",
                    summary["grand_total"]["total"],
                    summary["grand_total"]["unmatched"],
                    f"{summary['grand_total']['percent_complete']:.2f}%",
                ],
            ]
            self.logger.info(create_table(table))
        except Exception as exc:
            self.logger.error(f"\n\nAn error occurred: {exc}\n", exc_info=True)

    def build_output(self, db: DapsDB) -> Dict[str, Any]:
        stats = self.get_stats(db)
        unmatched_dict = stats["unmatched"]
        summary = stats["summary"]

        table = [
            ["Type", "Total", "Unmatched", "Percent Complete"],
            [
                "Movies",
                summary["movies"]["total"],
                summary["movies"]["unmatched"],
                f"{summary['movies']['percent_complete']:.2f}%",
            ],
            [
                "Series",
                summary["series"]["total"],
                summary["series"]["unmatched"],
                f"{summary['series']['percent_complete']:.2f}%",
            ],
            [
                "Seasons",
                summary["seasons"]["total"],
                summary["seasons"]["unmatched"],
                f"{summary['seasons']['percent_complete']:.2f}%",
            ],
            [
                "Collections",
                summary["collections"]["total"],
                summary["collections"]["unmatched"],
                f"{summary['collections']['percent_complete']:.2f}%",
            ],
            [
                "Grand Total",
                summary["grand_total"]["total"],
                summary["grand_total"]["unmatched"],
                f"{summary['grand_total']['percent_complete']:.2f}%",
            ],
        ]
        return {"unmatched_dict": unmatched_dict, "summary": table}

    def send_notification(self, db: DapsDB) -> None:
        manager = NotificationManager(
            self.config, self.logger, module_name="unmatched_assets"
        )
        output = self.build_output(db)
        manager.send_notification(output)

    def run(self) -> None:
        try:
            with DapsDB(logger=self.logger) as db:
                self.print_stats(db)

        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("\n\nAn error occurred:\n", exc_info=True)
        finally:
            self.logger.log_outro()
