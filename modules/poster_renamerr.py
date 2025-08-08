# modules/poster_renamerr.py

import filecmp
import json
import os
import shutil
import sys
from datetime import datetime
from typing import Any, Dict, List

from util.base_module import DapsModule
from util.connector import Connector
from util.constants import id_content_regex, season_number_regex, year_regex
from util.database import DapsDB
from util.helper import (
    create_table,
    extract_ids,
    extract_year,
    is_match,
    normalize_titles,
    print_settings,
    progress,
)
from util.logger import Logger
from util.notification import NotificationManager
from util.upload_posters import PosterUploader


class PosterRenamerr(DapsModule):
    def __init__(self) -> None:
        super().__init__()

    def ensure_destination_dir(self):
        if not os.path.exists(self.config.destination_dir):
            self.logger.info(
                f"Creating destination directory: {self.config.destination_dir}"
            )
            os.makedirs(self.config.destination_dir)
        else:
            self.logger.debug(
                f"Destination directory already exists: {self.config.destination_dir}"
            )

    def sync_posters(self):
        if self.config.sync_posters:
            self.logger.info("Running sync_gdrive")
            from modules.sync_gdrive import SyncGDrive

            syncer = SyncGDrive(logger=self.logger)
            syncer.run()
            self.logger.info("Finished running sync_gdrive")
        else:
            self.logger.debug("Sync posters is disabled. Skipping...")

    def process_file(self, file: str, new_file_path: str, action_type: str):
        try:
            if action_type == "copy":
                shutil.copy(file, new_file_path)
            elif action_type == "move":
                shutil.move(file, new_file_path)
            elif action_type == "hardlink":
                os.link(file, new_file_path)
            elif action_type == "symlink":
                os.symlink(file, new_file_path)
        except OSError as e:
            self.logger.error(f"Error {action_type}ing file: {e}")

    def match_item(self, media: dict, db: DapsDB, is_collection=False) -> dict:
        asset_type = media.get("asset_type")
        title = media.get("title")
        year = media.get("year")
        library_name = media.get("library_name")
        instance_name = media.get("instance_name")
        normalized_title = media.get("normalized_title")
        season_number = media.get("season_number")

        alt_titles = []
        try:
            alt_titles = json.loads(media.get("alternate_titles") or "[]")
        except Exception:
            pass

        reasons = []
        matched = False
        candidate = None
        candidates = []

        for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
            id_val = media.get(id_field)
            if id_val:
                c = db.poster.get_by_id(id_field, id_val, season_number)
                if c:
                    matched, reason = is_match(c, media)
                    if matched:
                        reasons.append(
                            f"Matched by {id_field}: {id_val} (season {season_number}) [{reason}]"
                        )
                        candidate = c
                        candidates = [c]
                        break

        if not candidate:
            candidates = db.poster.get_candidates_by_prefix(title)
            all_titles = set()
            if normalized_title:
                all_titles.add(normalized_title)
            all_titles.update({normalize_titles(t) for t in alt_titles if t})

            for cand in candidates:
                cand_season = cand.get("season_number")
                if season_number is not None and cand_season != season_number:
                    continue
                cand_norm_title = cand.get("normalized_title", "")
                cand_alt_titles = set(
                    json.loads(cand.get("normalized_alternate_titles", "[]") or "[]")
                )

                if cand_norm_title in all_titles or bool(
                    all_titles & set(cand_alt_titles)
                ):
                    m, reason = is_match(cand, media)
                    if m:
                        reasons.append(
                            f"Prefix/name candidate: {cand.get('title')} (season {cand.get('season_number')}) [{reason}]"
                        )
                        if not candidate:
                            candidate = cand
                            matched = True

        if is_collection:
            db.collection.update(
                title=title,
                year=year,
                library_name=library_name,
                instance_name=instance_name,
                matched_value=matched,
                original_file=candidate.get("file") if candidate else None,
            )
        else:
            db.media.update(
                asset_type=asset_type,
                title=title,
                year=year,
                instance_name=instance_name,
                matched_value=matched,
                season_number=season_number,
                original_file=candidate.get("file") if candidate else None,
            )

        if asset_type == "show":
            if season_number is not None:
                if matched and candidate:
                    self.logger.debug(
                        f"✓ Matched: [show] {title} ({year}) Season: {season_number} <-> {candidate.get('title')} ({candidate.get('year')}) Season: {candidate.get('season_number')}"
                    )
                else:
                    self.logger.debug(
                        f"✗ No match: [show] {title} ({year}) Season {season_number}"
                    )
            else:
                if matched and candidate:
                    self.logger.debug(
                        f"✓ Matched: [show] {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                    )
                else:
                    self.logger.debug(f"✗ No match: [show] {title} ({year})")

        elif is_collection:
            if matched and candidate:
                self.logger.debug(
                    f"✓ Matched: [collection] {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                )
            else:
                self.logger.debug(f"✗ No match: [collection] {title} ({year})")

        else:
            if matched and candidate:
                self.logger.debug(
                    f"✓ Matched: [movie] {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                )
            else:
                self.logger.debug(f"✗ No match: [movie] {title} ({year})")

        return {
            "matched": bool(matched),
            "match": candidate,
            "candidates": candidates,
            "reasons": reasons,
        }

    def match_assets_to_media(self, db: DapsDB):
        self.logger.info("Matching assets to media and collections, please wait...")
        all_media = []

        for inst in self.config.instances:
            if isinstance(inst, str):
                instance_name = inst
                media = db.media.get_by_instance(instance_name)
                if media:
                    all_media.extend(media)
            elif isinstance(inst, dict):
                for instance_name, params in inst.items():
                    library_names = params.library_names
                    if library_names:
                        for library_name in library_names:
                            collections = db.collection.get_by_instance_and_library(
                                instance_name, library_name
                            )
                            if collections:
                                all_media.extend(collections)
        total_items = len(all_media)
        if not all_media:
            self.logger.warning(
                "No media or collections found in database for matching."
            )
            return

        matches = 0
        non_matches = 0

        with progress(
            all_media,
            desc="Matching assets to media & collections",
            total=total_items,
            unit="media",
            logger=self.logger,
        ) as bar:
            for media in bar:
                is_collection = media.get("asset_type") == "collection"
                result = self.match_item(media, db, is_collection)
                if result["matched"]:
                    matches += 1
                else:
                    non_matches += 1

        self.logger.debug(f"Completed matching for all assets: {total_items} items")
        self.logger.debug(f"{matches} total_matches")
        self.logger.debug(f"{non_matches} non_matches")

    def rename_file(self, item: dict, db: DapsDB) -> dict:
        asset_type = item.get("asset_type")
        file = item.get("original_file") or item.get("file")
        folder = item.get("folder", item.get("media_folder", "")) or ""
        file_name = os.path.basename(file)
        file_extension = os.path.splitext(file)[1]
        season_number = item.get("season_number")
        config = self.config

        if config.asset_folders:
            dest_dir = os.path.join(config.destination_dir, folder)
            if (
                not os.path.exists(dest_dir)
                and not config.dry_run
                and not config.run_border_replacerr
            ):
                os.makedirs(dest_dir)
        else:
            dest_dir = config.destination_dir

        if asset_type == "show" and season_number is not None:
            season_str = str(season_number).zfill(2)
            if config.asset_folders:
                new_file_name = f"Season{season_str}{file_extension}"
            else:
                new_file_name = f"{folder}_Season{season_str}{file_extension}"
            new_file_path = os.path.join(dest_dir, new_file_name)
        else:
            if config.asset_folders:
                new_file_name = f"poster{file_extension}"
            else:
                new_file_name = f"{folder}{file_extension}"
            new_file_path = os.path.join(dest_dir, new_file_name)

        item["renamed_file"] = new_file_path

        if asset_type == "collection":
            db.collection.update(
                title=item.get("title"),
                year=item.get("year"),
                library_name=item.get("library_name"),
                instance_name=item.get("instance_name"),
                matched_value=None,
                original_file=None,
                renamed_file=new_file_path,
            )
        else:
            db.media.update(
                asset_type=asset_type,
                title=item.get("title"),
                year=item.get("year"),
                instance_name=item.get("instance_name"),
                matched_value=None,
                season_number=item.get("season_number"),
                original_file=None,
                renamed_file=new_file_path,
            )

        messages = []
        discord_message = []
        file_ops_enabled = not config.run_border_replacerr

        if os.path.lexists(new_file_path):
            existing_file = os.path.join(dest_dir, new_file_name)
            if not filecmp.cmp(file, existing_file):
                if file_name != new_file_name:
                    messages.append(f"{file_name} -renamed-> {new_file_name}")
                    discord_message.append(f"{new_file_name}")
                else:
                    if not config.print_only_renames:
                        messages.append(f"{file_name} -not-renamed-> {new_file_name}")
                        discord_message.append(f"{new_file_name}")
                if file_ops_enabled and not config.dry_run:
                    if config.action_type in ["hardlink", "symlink"]:
                        os.remove(new_file_path)
                    self.process_file(file, new_file_path, config.action_type)
        else:
            if file_name != new_file_name:
                messages.append(f"{file_name} -renamed-> {new_file_name}")
                discord_message.append(f"{new_file_name}")
            else:
                if not config.print_only_renames:
                    messages.append(f"{file_name} -not-renamed-> {new_file_name}")
                    discord_message.append(f"{new_file_name}")
            if file_ops_enabled and not config.dry_run:
                self.process_file(file, new_file_path, config.action_type)

        return {
            "title": item.get("title"),
            "year": item.get("year"),
            "folder": folder,
            "messages": messages,
            "discord_message": discord_message,
            "asset_type": asset_type,
            "id": item.get("id"),
        }

    def get_matched_assets(self, db: DapsDB) -> list:
        matched_assets = []
        for inst in self.config.instances:
            if isinstance(inst, str):
                instance_name = inst
                for row in db.media.get_by_instance(instance_name):
                    if row.get("matched") and (
                        not row.get("renamed_file")
                        or not os.path.exists(row.get("renamed_file"))
                    ):
                        matched_assets.append(row)
            elif isinstance(inst, dict):
                for instance_name, params in inst.items():
                    library_names = params.library_names
                    if library_names:
                        for library_name in library_names:
                            for row in db.collection.get_by_instance_and_library(
                                instance_name, library_name
                            ):
                                if row.get("matched") and (
                                    not row.get("renamed_file")
                                    or not os.path.exists(row.get("renamed_file"))
                                ):
                                    matched_assets.append(row)
        return matched_assets

    def rename_files(self, db: DapsDB) -> tuple:
        output: Dict[str, List[Dict[str, Any]]] = {
            "collection": [],
            "movie": [],
            "show": [],
        }
        manifest = {"media_cache": [], "collections_cache": []}
        matched_assets = self.get_matched_assets(db=db)

        if matched_assets:
            self.logger.info("Renaming assets please wait...")
            with progress(
                matched_assets,
                desc="Renaming assets",
                total=len(matched_assets),
                unit="assets",
                logger=self.logger,
            ) as bar:
                for item in bar:
                    result = self.rename_file(item=item, db=db)
                    output[item.get("asset_type", "movie")].append(result)

                    if item.get("asset_type") == "collection":
                        manifest["collections_cache"].append(item.get("id"))
                    else:
                        manifest["media_cache"].append(item.get("id"))
        return output, manifest

    def handle_output(self, output: Dict[str, List[Dict[str, Any]]]):
        headers = {"collection": "Collection", "movie": "Movie", "show": "Show"}
        for asset_type in ["collection", "movie", "show"]:
            assets = output.get(asset_type, [])
            header = f"{headers.get(asset_type, asset_type.capitalize())}s"
            self.logger.info(create_table([[header]]))

            if not assets:
                self.logger.info(f"No {header.lower()}s to rename\n")
                continue

            if asset_type == "show":
                grouped = {}
                for asset in assets:
                    key = (asset.get("title"), asset.get("year"), asset.get("folder"))
                    grouped.setdefault(key, {"messages": [], "discord_message": []})
                    grouped[key]["messages"].extend(asset.get("messages", []))
                    grouped[key]["discord_message"].extend(
                        asset.get("discord_message", [])
                    )

                for (title, year, folder), data in grouped.items():
                    display = f"{title} ({year})" if year else f"{title}"
                    self.logger.info(display)
                    for msg in data["messages"]:
                        self.logger.info(f"\t{msg}")
                    self.logger.info("")

            else:
                for asset in assets:
                    title = asset.get("title") or ""
                    year = asset.get("year")
                    display = f"{title} ({year})" if year else f"{title}"
                    self.logger.info(display)
                    for msg in asset.get("messages", []):
                        self.logger.info(f"\t{msg}")
                    self.logger.info("")

    def _get_assets_files(self, source_dir: str):
        asset_records = []
        for root, dirs, files in os.walk(source_dir):
            for fname in files:
                if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    continue
                fpath = os.path.join(root, fname)
                folder = os.path.basename(root)
                filename, _ = os.path.splitext(fname)

                title_base = id_content_regex.sub("", filename).strip()
                title = year_regex.sub("", title_base).strip()

                year = (
                    extract_year(fname) or extract_year(title) or extract_year(folder)
                )
                tmdb_id, tvdb_id, imdb_id = extract_ids(fname)
                if not (tmdb_id or tvdb_id or imdb_id):
                    tmdb_id, tvdb_id, imdb_id = extract_ids(folder)
                match = season_number_regex.search(fname) or season_number_regex.search(
                    folder
                )
                season_number = (
                    int(match.group(1))
                    if match and match.group(1)
                    else (0 if match else None)
                )

                record = {
                    "title": title,
                    "normalized_title": normalize_titles(title),
                    "year": year,
                    "tmdb_id": tmdb_id,
                    "tvdb_id": tvdb_id,
                    "imdb_id": imdb_id,
                    "season_number": season_number,
                    "folder": folder,
                    "file": fpath,
                }
                asset_records.append(record)
        return asset_records

    def merge_assets(self, source_dirs: List[str], db: DapsDB, logger: Logger):
        start_time = datetime.now()
        self.logger.info("Gathering all the posters, please wait...")
        logger = logger or self.logger
        source_dirs = source_dirs or self.config.source_dirs

        for src_idx, source_dir in enumerate(source_dirs):
            assets = self._get_assets_files(source_dir)
            if not assets:
                if logger:
                    logger.warning(f"No assets found in '{source_dir}'")
                continue

            for asset in assets:

                for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
                    id_val = asset.get(id_field)
                    if id_val:
                        db.poster.delete_by_id(
                            id_field, id_val, asset.get("season_number")
                        )

                db.poster.delete_by_title(
                    asset["normalized_title"],
                    asset.get("year"),
                    asset.get("season_number"),
                )

                matched = None
                id_fields = [
                    ("imdb_id", asset.get("imdb_id")),
                    ("tmdb_id", asset.get("tmdb_id")),
                    ("tvdb_id", asset.get("tvdb_id")),
                ]
                for id_field, id_val in id_fields:
                    if id_val:
                        matched = db.poster.get_by_id(
                            id_field, id_val, asset.get("season_number")
                        )
                        if matched:
                            break
                if not matched:
                    matched = db.poster.get_by_normalized_title(
                        asset["normalized_title"],
                        asset.get("year"),
                        asset.get("season_number"),
                    )
                if matched and not is_match(matched, asset)[0]:
                    matched = None

                if matched:
                    for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
                        if matched.get(id_field) and not asset.get(id_field):
                            asset[id_field] = matched[id_field]

                    db.poster.propagate_ids_for_show(
                        asset["title"], asset.get("year"), asset
                    )

                db.poster.upsert(asset)
        duration = datetime.now() - start_time
        hours, remainder = divmod(duration.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)
        formatted_duration = f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
        logger.debug(f"Merge run time: {formatted_duration}")

    def run_border_replacerr(self, manifest: dict):
        from modules.border_replacerr import BorderReplacerr

        border = BorderReplacerr(self.config, self.logger)

        self.logger.debug(
            "\nRunning border replacerr:\n"
            f"  Media assets to process: {len(manifest.get('media_cache', []))}\n"
            f"  Collection assets to process: {len(manifest.get('collections_cache', []))}\n"
            f"  Total assets to process: {len(manifest.get('media_cache', [])) + len(manifest.get('collections_cache', []))}\n"
        )
        border.run(manifest)
        self.logger.info("Finished running border_replacerr.")

    def run_poster_rename_adhoc(self, media_items: List[dict]) -> dict:
        """
        Process specific media items directly (like sync_gdrive.sync_folder_adhoc).
        This is the NEW method for webhook/API processing.

        Args:
            media_items: List of media items to process

        Returns:
            dict: Processing results with renamed files and manifest
        """
        log = self.logger.get_adapter("POSTER_ADHOC")

        if not media_items:
            return {"success": False, "message": "No media items provided"}

        try:
            with DapsDB(logger=self.logger) as db:
                self.ensure_destination_dir()

                # Clear and rebuild poster cache for current session
                db.poster.clear()
                self.merge_assets()

                # Process each media item
                output = {"collection": [], "movie": [], "show": []}
                manifest = {"media_cache": [], "collections_cache": []}

                matched_count = 0
                for media_item in media_items:
                    # Match poster to media
                    is_collection = media_item.get("asset_type") == "collection"
                    match_result = self.match_item(media_item, db, is_collection)

                    if match_result["matched"]:
                        matched_count += 1
                        # Get the updated item from DB after matching
                        if is_collection:
                            updated_item = db.collection.get_by_id(media_item.get("id"))
                        else:
                            updated_item = db.media.get_by_id(media_item.get("id"))

                        if updated_item:
                            # Rename the file
                            rename_result = self.rename_file(item=updated_item, db=db)

                            if rename_result:
                                asset_type = updated_item.get("asset_type", "movie")
                                output[asset_type].append(rename_result)

                                # Add to manifest
                                if asset_type == "collection":
                                    manifest["collections_cache"].append(
                                        updated_item["id"]
                                    )
                                else:
                                    manifest["media_cache"].append(updated_item["id"])

                log.info(
                    f"Processed {len(media_items)} media items, {matched_count} matched"
                )

                return {
                    "success": True,
                    "output": output,
                    "manifest": manifest,
                    "message": f"Successfully processed {matched_count}/{len(media_items)} items",
                    "stats": {
                        "total_items": len(media_items),
                        "matched_items": matched_count,
                        "renamed_items": sum(len(items) for items in output.values()),
                    },
                }

        except Exception as e:
            log.error(f"Error during adhoc poster rename: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error during poster rename: {str(e)}",
            }

    def run(self):
        """
        Full scheduled run - existing functionality unchanged.
        """
        try:
            with DapsDB(logger=self.logger) as db:
                if self.config.log_level == "debug":
                    print_settings(self.logger, self.config)

                self.ensure_destination_dir()

                if self.config.dry_run:
                    self.logger.info(
                        create_table([["Dry Run"], ["NO CHANGES WILL BE MADE"]])
                    )

                self.sync_posters()

                db.poster.clear()
                self.merge_assets(
                    source_dirs=self.config.source_dirs, db=db, logger=self.logger
                )
                instance_map = {
                    "arrs": [i for i in self.config.instances if isinstance(i, str)],
                    "plex": {
                        name: (opts.library_names or [])
                        for i in self.config.instances
                        if isinstance(i, dict)
                        for name, opts in i.items()
                    },
                }
                connector = Connector(
                    db=db, logger=self.logger, instance_map=instance_map
                )
                connector.update_arr_database()
                connector.update_collections_database()

                self.match_assets_to_media(db=db)
                output, manifest = self.rename_files(db)

                if self.config.report_unmatched_assets:
                    from modules.unmatched_assets import main as report_unmatched_assets

                    report_unmatched_assets()

                if self.config.run_cleanarr:
                    cleanarr_logger = Logger(self.config.log_level, "cleanarr")
                    db.orphaned.handle_orphaned_posters(
                        cleanarr_logger, self.config.dry_run
                    )

                if self.config.run_border_replacerr:
                    self.run_border_replacerr(manifest)

                PosterUploader(db=db, logger=self.logger, manifest=manifest).run()

                if any(output.values()):
                    self.handle_output(output)
                    manager = NotificationManager(
                        self.config, self.logger, module_name="poster_renamerr"
                    )
                    manager.send_notification(output)

        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("\n\nAn error occurred:\n", exc_info=True)
        finally:
            self.logger.log_outro()
