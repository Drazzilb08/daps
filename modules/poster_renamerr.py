import filecmp
import json
import os
import shutil
import sys
from typing import Any, Dict, List

import os
from typing import Any, List, Optional

from util.constants import id_content_regex, season_number_regex, year_regex
from util.database import DapsDB
from util.helper import extract_ids, extract_year, is_match, normalize_titles

from util.config import Config
from util.connector import update_client_databases, update_collections_database
from util.database import DapsDB
from util.helper import (
    create_table,
    is_match,
    normalize_titles,
    print_settings,
    progress,
)
from util.logger import Logger
from util.notification import NotificationManager
from util.upload_posters import upload_posters


class PosterRenamerr:
    def __init__(self, config: Config, logger: Logger = None, db: DapsDB = None):
        self.config = config
        self.logger = logger or Logger(
            getattr(config, "log_level", "INFO"), config.module_name
        )
        self.db = db or DapsDB()

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
        if getattr(self.config, "sync_posters", False):
            self.logger.info("Running sync_gdrive")
            from modules.sync_gdrive import main as gdrive_main
            from util.config import Config as SyncGDriveConfig

            gdrive_config = SyncGDriveConfig("sync_gdrive").module_config
            gdrive_main(gdrive_config)
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


    def match_item(self, media: dict, is_collection=False) -> dict:
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

        # --- ID Match: stop at first valid ---
        for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
            id_val = media.get(id_field)
            if id_val:
                c = self.db.poster.get_by_id(id_field, id_val, season_number)
                if c:
                    matched, reason = is_match(c, media)
                    if matched:
                        reasons.append(
                            f"Matched by {id_field}: {id_val} (season {season_number}) [{reason}]"
                        )
                        candidate = c
                        candidates = [c]
                        break

        # --- Name/Title Candidates: gather ALL ---
        if not candidate:
            # Prefix-based candidate search (ignores common words)
            candidates = self.db.poster.get_candidates_by_prefix(title)

            # Prepare all normalized/alternate titles for expanded matching
            all_titles = set()
            if normalized_title:
                all_titles.add(normalized_title)
            all_titles.update({normalize_titles(t) for t in alt_titles if t})

            # Try to match each candidate, including normalized and alternate titles
            for cand in candidates:
                # Compare against all title variants
                cand_norm_title = cand.get("normalized_title", "")
                cand_alt_titles = set(
                    json.loads(cand.get("normalized_alternate_titles", "[]") or "[]")
                )

                # If any title variant matches (normalized or alternate), count as matched
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

        # --- DB Update as before ---
        if is_collection:
            self.db.collection.update(
                title=title,
                year=year,
                library_name=library_name,
                instance_name=instance_name,
                matched_value=matched,
                original_file=candidate.get("file") if candidate else None,
            )
        else:
            print(f"Updating | Asset Type: {asset_type} | Title: {title} | Year: {year} | Instance: {instance_name} | Season: {season_number} | original_file: {candidate.get('file') if candidate else None}")
            self.db.media.update(
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
                # Per-season match
                if matched and candidate:
                    self.logger.debug(
                        f"✓ Matched: show S{season_number}: {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                    )
                else:
                    self.logger.debug(
                        f"✗ No match: show S{season_number}: {title} ({year})"
                    )
            else:
                # Main show match
                if matched and candidate:
                    self.logger.debug(
                        f"✓ Matched: show main: {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                    )
                else:
                    self.logger.debug(
                        f"✗ No match: show main: {title} ({year})"
                    )

        elif is_collection:
            if matched and candidate:
                self.logger.debug(
                    f"✓ Matched: [collection] {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                )
            else:
                self.logger.debug(
                    f"✗ No match: [collection] {title} ({year})"
                )

        else:
            # Movies and all other asset types
            if matched and candidate:
                self.logger.debug(
                    f"✓ Matched: {title} ({year}) <-> {candidate.get('title')} ({candidate.get('year')})"
                )
            else:
                self.logger.debug(
                    f"✗ No match: {title} ({year})"
                )

        return {
            "matched": bool(matched),
            "match": candidate,
            "candidates": candidates,
            "reasons": reasons,
        }

    def match_assets_to_media(self):
        self.logger.info("Matching assets to media and collections, please wait...")
        all_media = []

        for inst in self.config.instances:
            if isinstance(inst, str):
                instance_name = inst
                media = self.db.media.get_by_instance(instance_name)
                if media:
                    all_media.extend(media)
            elif isinstance(inst, dict):
                for instance_name, params in inst.items():
                    library_names = params.get("library_names", [])
                    if library_names:
                        for library_name in library_names:
                            collections = (
                                self.db.collection.get_by_instance_and_library(
                                    instance_name, library_name
                                )
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
                result = self.match_item(media, is_collection)
                if result["matched"]:
                    matches += 1
                else:
                    non_matches += 1

        self.logger.debug(f"Completed matching for all assets: {total_items} items")
        self.logger.debug(f"{matches} total_matches")
        self.logger.debug(f"{non_matches} non_matches")

    def rename_file(self, item: dict) -> dict:
        """
        Renames a single item and updates DB. Returns output dict for reporting.
        """
        asset_type = item.get("asset_type")
        file = item.get("original_file") or item.get("file")
        folder = item.get("folder", item.get("media_folder", "")) or ""
        file_name = os.path.basename(file)
        file_extension = os.path.splitext(file)[1]
        season_number = item.get("season_number")
        config = self.config

        # Folder logic as before
        if getattr(config, "asset_folders", False):
            dest_dir = os.path.join(config.destination_dir, folder)
            if not os.path.exists(dest_dir) and not config.dry_run and not config.run_border_replacerr:
                os.makedirs(dest_dir)
        else:
            dest_dir = config.destination_dir

        # Name logic as before
        if asset_type == "show" and season_number is not None:
            season_str = str(season_number).zfill(2)
            if getattr(config, "asset_folders", False):
                new_file_name = f"Season{season_str}{file_extension}"
            else:
                new_file_name = f"{folder}_Season{season_str}{file_extension}"
            new_file_path = os.path.join(dest_dir, new_file_name)
        else:
            if getattr(config, "asset_folders", False):
                new_file_name = f"poster{file_extension}"
            else:
                new_file_name = f"{folder}{file_extension}"
            new_file_path = os.path.join(dest_dir, new_file_name)

        item["renamed_file"] = new_file_path

        # DB update as before
        if asset_type == "collection":
            self.db.collection.update(
                title=item.get("title"),
                year=item.get("year"),
                library_name=item.get("library_name"),
                instance_name=item.get("instance_name"),
                matched_value=None,
                original_file=None,
                renamed_file=new_file_path,
            )
        else:
            self.db.media.update(
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
        file_ops_enabled = not getattr(config, "run_border_replacerr", False)

        if os.path.lexists(new_file_path):
            existing_file = os.path.join(dest_dir, new_file_name)
            if not filecmp.cmp(file, existing_file):
                if file_name != new_file_name:
                    messages.append(f"{file_name} -renamed-> {new_file_name}")
                    discord_message.append(f"{new_file_name}")
                else:
                    if not getattr(config, "print_only_renames", False):
                        messages.append(f"{file_name} -not-renamed-> {new_file_name}")
                        discord_message.append(f"{new_file_name}")
                if file_ops_enabled and not config.dry_run:
                    if getattr(config, "action_type", None) in ["hardlink", "symlink"]:
                        os.remove(new_file_path)
                    self.process_file(file, new_file_path, config.action_type)
        else:
            if file_name != new_file_name:
                messages.append(f"{file_name} -renamed-> {new_file_name}")
                discord_message.append(f"{new_file_name}")
            else:
                if not getattr(config, "print_only_renames", False):
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
    
    def get_matched_assets(self) -> list:
        """
        Gather all matched, unrenamed assets from both media and collections.
        """
        matched_assets = []
        for inst in self.config.instances:
            if isinstance(inst, str):
                instance_name = inst
                for row in self.db.media.get_by_instance(instance_name):
                    if row.get("matched") and (
                        not row.get("renamed_file")
                        or not os.path.exists(row.get("renamed_file"))
                    ):
                        matched_assets.append(row)
            elif isinstance(inst, dict):
                for instance_name, params in inst.items():
                    library_names = params.get("library_names", [])
                    if library_names:
                        for library_name in library_names:
                            for row in self.db.collection.get_by_instance_and_library(
                                instance_name, library_name
                            ):
                                if row.get("matched") and (
                                    not row.get("renamed_file")
                                    or not os.path.exists(row.get("renamed_file"))
                                ):
                                    matched_assets.append(row)
        return matched_assets

    def rename_files(self) -> tuple:
        """
        Renames all eligible assets using rename_file(). Returns output and manifest as before.
        """
        output: Dict[str, List[Dict[str, Any]]] = {
            "collection": [],
            "movie": [],
            "show": [],
        }
        manifest = {"media_cache": [], "collections_cache": []}
        matched_assets = self.get_matched_assets() 

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
                    result = self.rename_file(item)
                    output[item.get("asset_type", "movie")].append(result)
                    # Add to manifest as before
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
                    self.logger.info("")  # Spacing

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
        """
        Scan a directory for asset files and build a list of records with normalized and alternate titles.
        """
        asset_records = []
        for root, dirs, files in os.walk(source_dir):
            for fname in files:
                if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    continue
                fpath = os.path.join(root, fname)
                folder = os.path.basename(root)
                filename, _ = os.path.splitext(fname)

                # Try to extract title (pre-parenthesis, pre-brace, else whole filename)
                title_base = id_content_regex.sub("", filename).strip()
                title = year_regex.sub("", title_base).strip()

                # Get year, ids, and season number
                year = extract_year(fname) or extract_year(title) or extract_year(folder)
                tmdb_id, tvdb_id, imdb_id = extract_ids(fname)
                if not (tmdb_id or tvdb_id or imdb_id):
                    tmdb_id, tvdb_id, imdb_id = extract_ids(folder)
                match = season_number_regex.search(fname) or season_number_regex.search(folder)
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

    def merge_assets(self, source_dirs=None, db=None, logger=None):
        """
        For each directory (low->high priority), scan assets and upsert them so that
        higher priority assets overwrite lower priority ones in the DB.
        This version deletes any previous matches (by ID or normalized title/year/season_number)
        before inserting the new asset.

        Args:
            source_dirs (list, optional): Directories to scan. Defaults to self.config.source_dirs.
            db (DapsDB, optional): Database to use. Defaults to self.db.
            logger (Logger, optional): Logger to use. Defaults to self.logger.
        """
        db = db or self.db
        logger = logger or self.logger
        source_dirs = source_dirs or getattr(self.config, "source_dirs", [])

        for src_idx, source_dir in enumerate(source_dirs):
            assets = self._get_assets_files(source_dir)
            if not assets:
                if logger:
                    logger.warning(f"No assets found in '{source_dir}'")
                continue

            for asset in assets:
                # Always delete all possible matches, so only highest-priority wins

                # 1. Delete by IDs, if present
                for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
                    id_val = asset.get(id_field)
                    if id_val:
                        db.poster.delete_by_id(id_field, id_val, asset.get("season_number"))

                # 2. Delete by normalized_title/year/season_number
                db.poster.delete_by_title(
                    asset["normalized_title"], asset.get("year"), asset.get("season_number")
                )

                # 3. Try to find a match for ID propagation (e.g. old record with an ID, new without)
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

                # 4. Propagate IDs if needed (old had ID, new didn't)
                if matched:
                    for id_field in ["imdb_id", "tmdb_id", "tvdb_id"]:
                        if matched.get(id_field) and not asset.get(id_field):
                            asset[id_field] = matched[id_field]
                    # For shows: propagate IDs to all seasons if this is a season poster
                    db.poster.propagate_ids_for_show(
                        asset["title"], asset.get("year"), asset
                    )
                # 5. Upsert the new asset (now the only entry for this logical asset)
                db.poster.upsert(asset)

    def run_border_replacerr(self, manifest: List[int]):
        from modules.border_replacerr import run_replacerr

        self.logger.debug(
            "\nRunning border replacerr:\n"
            f"  Media assets to process: {len(manifest.get('media_cache', []))}\n"
            f"  Collection assets to process: {len(manifest.get('collections_cache', []))}\n"
            f"  Total assets to process: {len(manifest.get('media_cache', [])) + len(manifest.get('collections_cache', []))}\n"
        )
        run_replacerr(self.db, self.config, manifest, self.logger)
        self.logger.info("Finished running border_replacerr.")

    def run(self):
        try:
            if getattr(self.config, "log_level", "INFO") == "debug":
                print_settings(self.logger, self.config)

            self.ensure_destination_dir()

            if self.config.dry_run:
                self.logger.info(
                    create_table([["Dry Run"], ["NO CHANGES WILL BE MADE"]])
                )

            self.sync_posters()

            self.logger.info("Gathering all the posters, please wait...")
            self.db.poster.clear()
            self.merge_assets()

            update_client_databases(
                self.db, self.config, self.logger, max_age_hours=6, force_reindex=True
            )
            update_collections_database(self.db, self.config, self.logger)

            self.match_assets_to_media()
            output, manifest = self.rename_files()

            if self.config.report_unmatched_assets:
                self.db.poster.close()
                from modules.unmatched_assets import main as report_unmatched_assets

                report_unmatched_assets()

            if self.config.run_cleanarr:
                cleanarr_logger = Logger(
                    getattr(self.config, "log_level", "INFO"), "cleanarr"
                )
                self.db.orphaned.handle_orphaned_posters(
                    cleanarr_logger, self.config.dry_run
                )

            if self.config.run_border_replacerr:
                self.run_border_replacerr(manifest)

            upload_posters(self.config, self.db, self.logger, manifest)

            if any(output.values()):
                self.handle_output(output)
                manager = NotificationManager(
                    self.config, self.logger, module_name=self.config.module_name
                )
                manager.send_notification(output)

        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("\n\nAn error occurred:\n", exc_info=True)
        finally:
            self.db.close_all()
            self.logger.log_outro()


def main():
    config = Config("poster_renamerr")
    renamer = PosterRenamerr(config)
    renamer.run()
