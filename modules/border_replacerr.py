# modules/border_replacerr.py

import filecmp
import logging
import os
import shutil
from datetime import datetime
from typing import Tuple

from PIL import Image

from util.base_module import DapsModule
from util.database import DapsDB
from util.helper import create_table, print_settings, progress

logging.getLogger("PIL").setLevel(logging.WARNING)


class BorderReplacerr(DapsModule):
    def __init__(self) -> None:
        super().__init__()

    def get_holiday_status(self, db: DapsDB):
        now = datetime.now()
        holidays = self.config.holidays
        default_colors = self.config.border_colors
        skip_enabled = self.config.skip

        last_status = db.holiday.get_status()
        last_active_holiday = last_status["last_active_holiday"]

        current_holiday = None
        border_colors = None
        for holiday_item in holidays:
            holiday = holiday_item.name
            schedule = holiday_item.schedule
            color_list = getattr(holiday_item, "colors", default_colors)
            if not schedule or not schedule.startswith("range("):
                continue
            inside = schedule[len("range(") : -1]
            start_str, end_str = inside.split("-", 1)
            sm, sd = map(int, start_str.split("/"))
            em, ed = map(int, end_str.split("/"))
            year = now.year

            start_date = datetime(year, sm, sd)
            end_date = datetime(year, em, ed)
            if end_date < start_date:  # handle year crossover
                if now.month < sm:
                    start_date = start_date.replace(year=year - 1)
                else:
                    end_date = end_date.replace(year=year + 1)
            if start_date <= now <= end_date:
                if isinstance(color_list, str):
                    color_list = [color_list]
                border_colors = [self.convert_to_rgb(c) for c in color_list]
                current_holiday = holiday
                break

        if not border_colors and default_colors:
            border_colors = [self.convert_to_rgb(c) for c in default_colors]

        reset_all = current_holiday != last_active_holiday
        result = {
            "active_holiday": current_holiday,
            "last_active_holiday": last_active_holiday,
            "border_colors": border_colors,
            "skip_enabled": skip_enabled,
            "reset_all": reset_all,
        }
        return result

    def convert_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        hex_color = hex_color.strip("#")
        if len(hex_color) == 3:
            hex_color = hex_color * 2
        try:
            color_code = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
        except ValueError:
            self.logger.error(
                f"Error: {hex_color} is not a valid hexadecimal color code.\nDefaulting to white."
            )
            return (255, 255, 255)
        return color_code

    def replace_borders(self, original_file, renamed_file, border_color, border_width):
        try:
            with Image.open(original_file) as image:
                width, height = image.size
                cropped = image.crop(
                    (
                        border_width,
                        border_width,
                        width - border_width,
                        height - border_width,
                    )
                )
                new_width = cropped.width + 2 * border_width
                new_height = cropped.height + 2 * border_width
                out_img = Image.new("RGB", (new_width, new_height), border_color)
                out_img.paste(cropped, (border_width, border_width))
                out_img = out_img.resize((1000, 1500)).convert("RGB")

                tmp_path = f"/tmp/{os.path.basename(renamed_file)}"
                out_img.save(tmp_path)
                if not os.path.exists(renamed_file) or not filecmp.cmp(
                    renamed_file, tmp_path
                ):
                    os.makedirs(os.path.dirname(renamed_file), exist_ok=True)
                    shutil.move(tmp_path, renamed_file)
                    self.logger.debug(
                        f"Replaced border: {os.path.basename(original_file)} → {os.path.basename(renamed_file)}"
                    )
                    return True
                else:
                    os.remove(tmp_path)
                    self.logger.debug(
                        f"No border update needed for {os.path.basename(renamed_file)}"
                    )
                    return False
        except Exception as e:
            self.logger.error(
                f"Error replacing border on {os.path.basename(original_file)}: {e}"
            )
            return False

    def remove_borders(self, original_file, renamed_file, border_width):
        try:
            with Image.open(original_file) as image:
                width, height = image.size
                cropped = image.crop(
                    (
                        border_width,
                        border_width,
                        width - border_width,
                        height - border_width,
                    )
                )
                cropped = cropped.resize((1000, 1500)).convert("RGB")

                tmp_path = f"/tmp/{os.path.basename(renamed_file)}"
                cropped.save(tmp_path)
                if not os.path.exists(renamed_file) or not filecmp.cmp(
                    renamed_file, tmp_path
                ):
                    os.makedirs(os.path.dirname(renamed_file), exist_ok=True)
                    shutil.move(tmp_path, renamed_file)
                    self.logger.debug(
                        f"Removed border: {os.path.basename(original_file)} → {os.path.basename(renamed_file)}"
                    )
                    return True
                else:
                    os.remove(tmp_path)
                    self.logger.debug(
                        f"No border update needed for {os.path.basename(renamed_file)}"
                    )
                    return False
        except Exception as e:
            self.logger.error(
                f"Error removing border on {os.path.basename(original_file)}: {e}"
            )
            return False

    def run(self, manifest: dict):
        with DapsDB(logger=self.logger) as db:
            if self.config.log_level.lower() == "debug":
                print_settings(self.logger, self.config)

            results = self.get_holiday_status(db=db)
            skip_enabled = results["skip_enabled"]
            reset_all = results["reset_all"]
            active_holiday = results["active_holiday"]

            if skip_enabled and not active_holiday:
                self.logger.info(
                    "Border replacerr is in skip mode and today is not a holiday. Skipping all processing."
                )
                db.holiday.set_status(active_holiday)
                return
            if skip_enabled and active_holiday:
                self.logger.info(
                    "Border replacerr skip mode: Overriding skip due to active holiday."
                )

            assets = []
            color_index = 0
            processed = 0
            replaced = 0
            removed = 0
            skipped = 0
            if reset_all:
                self.logger.debug(
                    "Holiday state changed (or startup). Doing full reprocessing of all matched assets."
                )
                for row in db.media.get_all():
                    if row["matched"] == 1:
                        if (
                            self.config.exclusion_list
                            and row["title"] in self.config.exclusion_list
                        ):
                            self.logger.debug(
                                f"Skipping '{row['title']}' (in exclusion_list)."
                            )
                            skipped += 1
                            continue
                        assets.append(row)
            else:
                all_ids = [("media_cache", i) for i in manifest["media_cache"]] + [
                    ("collections_cache", i) for i in manifest["collections_cache"]
                ]
                for source, asset_id in all_ids:
                    if source == "media_cache":
                        asset = db.media.get_by_id(asset_id)
                    else:
                        asset = db.collection.get_by_id(asset_id)
                    if not asset:
                        self.logger.warning(
                            f"Asset ID {asset_id} not found in {source}. Skipping."
                        )
                        continue
                    if (
                        self.config.exclusion_list
                        and asset["title"] in self.config.exclusion_list
                    ):
                        self.logger.debug(
                            f"Skipping '{asset['title']}' (in exclusion_list)."
                        )
                        continue
                    assets.append(asset)

            if not assets:
                self.logger.info("No assets to process for border replacerr.")
                db.holiday.set_status(active_holiday)
                return

            border_colors = results["border_colors"]
            dry_run = self.config.dry_run

            self.logger.debug(f"Total assets to process: {len(assets)}")
            if border_colors:
                self.logger.debug(
                    f"Border colors: {', '.join(f'#{r:02x}{g:02x}{b:02x}' for (r,g,b) in border_colors)}"
                )
            else:
                self.logger.debug("Border colors: None (removing borders)")

            self.logger.info(f"Processing {len(assets)} posters, please wait...")
            with progress(
                assets,
                desc="Processing Posters",
                total=len(assets),
                unit="posters",
                logger=self.logger,
            ) as bar:
                for asset in bar:
                    original_file = asset["original_file"]
                    renamed_file = asset["renamed_file"]
                    title = asset["title"]
                    if not original_file or not renamed_file:
                        self.logger.warning(
                            f"Asset '{title}' missing file info. Skipping."
                        )
                        skipped += 1
                        continue

                    if border_colors:
                        color = border_colors[color_index]
                        if not dry_run:
                            result = self.replace_borders(
                                original_file,
                                renamed_file,
                                color,
                                self.config.border_width,
                            )
                        else:
                            self.logger.info(
                                f"[DRY RUN] Would replace border for: {renamed_file}"
                            )
                            result = True
                        color_index = (color_index + 1) % len(border_colors)
                        if result:
                            replaced += 1
                        processed += 1
                    else:
                        if not dry_run:
                            result = self.remove_borders(
                                original_file,
                                renamed_file,
                                self.config.border_width,
                            )
                        else:
                            self.logger.info(
                                f"[DRY RUN] Would remove border for: {renamed_file}"
                            )
                            result = True
                        if result:
                            removed += 1
                        processed += 1

            self.logger.info("")  # Spacing
            self.logger.info(create_table([["Border Replacerr Summary"]]))
            summary_table = [
                ["Processed", processed],
                ["Skipped", skipped],
            ]
            if replaced:
                summary_table.append(["Borders replaced", replaced])
            elif removed:
                summary_table.append(["Borders removed", removed])
            else:
                summary_table.append(["Borders changed", 0])
            for row in summary_table:
                self.logger.info(f"{row[0]:<20}: {row[1]}")

            if replaced or removed:
                action = []
                if replaced:
                    action.append(f"{replaced} replaced")
                if removed:
                    action.append(f"{removed} removed")
                self.logger.info(
                    f"Border replacerr completed: {processed} processed, {', '.join(action)}, {skipped} skipped."
                )
            else:
                self.logger.info(
                    f"Border replacerr completed: {processed} processed, {skipped} skipped. No borders changed."
                )
            self.logger.info("")

            db.holiday.set_status(active_holiday)
