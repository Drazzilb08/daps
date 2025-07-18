from util.config import Config
from util.database import DapsDB
from util.logger import Logger
from util.notification import NotificationManager


def get_unmatched_assets_stats(db, config):
    # --- DB fetches ---
    unmatched_media = db.get_unmatched_media()
    unmatched_collections = db.get_unmatched_collections()
    all_media = db.get_media_cache()
    all_collections = db.get_collection_cache()

    # --- Instance/library filtering ---
    allowed_instances = set()
    plex_libraries = {}
    for inst in getattr(config, "instances", []):
        if isinstance(inst, str):
            allowed_instances.add(inst)
        elif isinstance(inst, dict):
            for instance_name, params in inst.items():
                allowed_instances.add(instance_name)
                libs = set(params.get("library_names", []))
                if libs:
                    plex_libraries[instance_name] = libs

    def allowed_media(asset):
        inst = asset.get("instance_name")
        return bool(inst and inst in allowed_instances)

    def allowed_collection(asset):
        inst = asset.get("instance_name")
        lib = asset.get("library_name")
        if inst not in allowed_instances:
            return False
        if inst in plex_libraries:
            return lib in plex_libraries[inst]
        return True

    unmatched_media = [a for a in unmatched_media if allowed_media(a)]
    unmatched_collections = [a for a in unmatched_collections if allowed_collection(a)]
    all_media = [a for a in all_media if allowed_media(a)]
    all_collections = [a for a in all_collections if allowed_collection(a)]

    # --- User config filters ---
    def should_include(asset):
        if getattr(config, "ignore_folders", []) and asset.get("folder") in config.ignore_folders:
            return False
        profile = asset.get("profile") or asset.get("quality_profile")
        if getattr(config, "ignore_profiles", []) and profile in config.ignore_profiles:
            return False
        tags = asset.get("tags", [])
        if isinstance(tags, str):
            import json
            try:
                tags = json.loads(tags)
            except Exception:
                tags = [t.strip() for t in tags.split(",") if t.strip()]
        if getattr(config, "ignore_tags", []):
            if any(tag in config.ignore_tags for tag in tags):
                return False
        if getattr(config, "ignore_titles", []) and asset.get("title") in config.ignore_titles:
            return False
        return True

    unmatched_media = [a for a in unmatched_media if should_include(a)]
    unmatched_collections = [a for a in unmatched_collections if should_include(a)]
    all_media = [a for a in all_media if should_include(a)]
    all_collections = [a for a in all_collections if should_include(a)]

    # --- Grouping ---
    group_map = {
        "movie": "movies",
        "show": "series",
        "series": "series"
    }
    unmatched = {"movies": [], "series": [], "collections": []}
    all_media_grouped = {"movies": [], "series": []}
    all_collections_grouped = []

    for row in unmatched_media:
        key = group_map.get(row.get("asset_type"))
        if not key:
            continue
        entry = dict(row)
        if key == "series":
            if entry.get("season_number") is not None:
                found = next((s for s in unmatched["series"]
                              if s["title"] == entry["title"] and s.get("year") == entry.get("year")), None)
                if found:
                    found.setdefault("missing_seasons", []).append(entry["season_number"])
                else:
                    unmatched["series"].append({
                        "title": entry["title"],
                        "year": entry.get("year"),
                        "missing_seasons": [entry["season_number"]],
                        "missing_main_poster": False
                    })
            else:
                found = next((s for s in unmatched["series"]
                              if s["title"] == entry["title"] and s.get("year") == entry.get("year")), None)
                if found:
                    found["missing_main_poster"] = True
                else:
                    unmatched["series"].append({
                        "title": entry["title"],
                        "year": entry.get("year"),
                        "missing_seasons": [],
                        "missing_main_poster": True
                    })
        else:
            unmatched[key].append(entry)

    for row in unmatched_collections:
        unmatched["collections"].append(dict(row))

    for row in all_media:
        key = group_map.get(row.get("asset_type"))
        if not key:
            continue
        entry = dict(row)
        if key == "series":
            found = next((s for s in all_media_grouped["series"]
                          if s["title"] == entry["title"] and s.get("year") == entry.get("year")), None)
            if found:
                if entry.get("season_number") is not None:
                    found.setdefault("seasons", []).append(entry["season_number"])
            else:
                seasons = []
                if entry.get("season_number") is not None:
                    seasons = [entry["season_number"]]
                all_media_grouped["series"].append({
                    "title": entry["title"],
                    "year": entry.get("year"),
                    "seasons": seasons
                })
        else:
            all_media_grouped[key].append(entry)

    for row in all_collections:
        all_collections_grouped.append(dict(row))

    # --- Stats ---
    unmatched_movies_total = len(unmatched["movies"])
    total_movies = len(all_media_grouped["movies"])
    percent_movies_complete = ((total_movies - unmatched_movies_total) / total_movies * 100) if total_movies else 0

    unmatched_series_total = sum(1 for item in unmatched["series"] if item.get("missing_main_poster", False))
    total_series = len(all_media_grouped["series"])
    percent_series_complete = ((total_series - unmatched_series_total) / total_series * 100) if total_series else 0

    unmatched_seasons_total = sum(len(item.get("missing_seasons", [])) for item in unmatched["series"])
    total_seasons = sum(len(item.get("seasons", [])) for item in all_media_grouped["series"])
    percent_seasons_complete = ((total_seasons - unmatched_seasons_total) / total_seasons * 100) if total_seasons else 0

    unmatched_collections_total = len(unmatched["collections"])
    total_collections = len(all_collections_grouped)
    percent_collections_complete = ((total_collections - unmatched_collections_total) / total_collections * 100) if total_collections else 0

    grand_total = total_movies + total_series + total_seasons + total_collections
    grand_unmatched = unmatched_movies_total + unmatched_series_total + unmatched_seasons_total + unmatched_collections_total
    percent_grand_complete = ((grand_total - grand_unmatched) / grand_total * 100) if grand_total else 0

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

    return {
        "unmatched": unmatched,
        "all_media": all_media_grouped,
        "all_collections": all_collections_grouped,
        "summary": summary,
    }

def print_unmatched_assets(db, logger, config):
    from util.helper import create_table
    stats = get_unmatched_assets_stats(db, config)
    unmatched = stats["unmatched"]
    all_media = stats["all_media"]
    all_collections = stats["all_collections"]
    summary = stats["summary"]

    asset_types = ["movies", "series", "collections"]
    for asset_type in asset_types:
        data_set = unmatched.get(asset_type, [])
        if data_set:
            table = [[f"Unmatched {asset_type.capitalize()}"]]
            logger.info(create_table(table))
            for idx, item in enumerate(data_set):
                if idx % 10 == 0:
                    logger.info(
                        f"\t*** {asset_type.title()} {idx + 1} - {min(idx + 10, len(data_set))} ***"
                    )
                    logger.info("")
                if asset_type == "series":
                    title = item.get("title", "Unknown")
                    year = item.get("year", "")
                    missing_seasons = item.get("missing_seasons", [])
                    missing_main = item.get("missing_main_poster", False)
                    if missing_seasons and missing_main:
                        logger.info(f"\t{title} ({year})")
                        for season in missing_seasons:
                            logger.info(f"\t\tSeason: {season}")
                    elif missing_seasons:
                        logger.info(f"\t{title} ({year}) (Seasons listed below have missing posters)")
                        for season in missing_seasons:
                            logger.info(f"\t\tSeason: {season}")
                    elif missing_main:
                        logger.info(f"\t{title} ({year})  Main series poster missing")
                else:
                    year = f" ({item.get('year')})" if item.get("year") else ""
                    logger.info(f"\t{item.get('title')}{year}")
                logger.info("")
            logger.info("")

    logger.info("")
    logger.info(create_table([["Statistics"]]))
    table = [
        ["Type", "Total", "Unmatched", "Percent Complete"],
        ["Movies", summary["movies"]["total"], summary["movies"]["unmatched"], f"{summary['movies']['percent_complete']:.2f}%"],
        ["Series", summary["series"]["total"], summary["series"]["unmatched"], f"{summary['series']['percent_complete']:.2f}%"],
        ["Seasons", summary["seasons"]["total"], summary["seasons"]["unmatched"], f"{summary['seasons']['percent_complete']:.2f}%"],
        ["Collections", summary["collections"]["total"], summary["collections"]["unmatched"], f"{summary['collections']['percent_complete']:.2f}%"],
        ["Grand Total", summary["grand_total"]["total"], summary["grand_total"]["unmatched"], f"{summary['grand_total']['percent_complete']:.2f}%"]
    ]
    logger.info(create_table(table))

def build_unmatched_assets_output(db, config):
    stats = get_unmatched_assets_stats(db, config)
    unmatched_dict = stats["unmatched"]
    summary = stats["summary"]

    # Build summary table rows like print_unmatched_assets
    table = [
        ["Type", "Total", "Unmatched", "Percent Complete"],
        ["Movies", summary["movies"]["total"], summary["movies"]["unmatched"], f"{summary['movies']['percent_complete']:.2f}%"],
        ["Series", summary["series"]["total"], summary["series"]["unmatched"], f"{summary['series']['percent_complete']:.2f}%"],
        ["Seasons", summary["seasons"]["total"], summary["seasons"]["unmatched"], f"{summary['seasons']['percent_complete']:.2f}%"],
        ["Collections", summary["collections"]["total"], summary["collections"]["unmatched"], f"{summary['collections']['percent_complete']:.2f}%"],
        ["Grand Total", summary["grand_total"]["total"], summary["grand_total"]["unmatched"], f"{summary['grand_total']['percent_complete']:.2f}%"]
    ]
    return {
        "unmatched_dict": unmatched_dict,
        "summary": table
    }

def main():
    config = Config("unmatched_assets")
    logger = Logger(config.log_level, config.module_name)
    db = DapsDB()
    print_unmatched_assets(db, logger, config)
    output = build_unmatched_assets_output(db, config)
    manager = NotificationManager(config, logger, module_name="unmatched_assets")
    manager.send_notification(output)
    db.close()