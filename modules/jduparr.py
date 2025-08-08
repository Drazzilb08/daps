# modules/jduparr.py

import os
import subprocess
import sys

from util.base_module import DapsModule
from util.helper import create_table, print_settings
from util.notification import NotificationManager


class Jduparr(DapsModule):
    def __init__(self) -> None:
        super().__init__()

    def print_output(self, output: list[dict]) -> None:
        count = 0
        for item in output:
            path = item["source_dir"]
            field_message = item["field_message"]
            files = item["output"]
            sub_count = item["sub_count"]

            self.logger.info(f"Findings for path: {path}")
            self.logger.info(f"\t{field_message}")
            for i in files:
                count += 1
                self.logger.info(f"\t\t{i}")
            count += sub_count
            self.logger.info(
                f"\tTotal items for '{os.path.basename(os.path.normpath(path))}': {sub_count}"
            )
        self.logger.info(f"Total items relinked: {count}")

    def run(self) -> None:
        try:
            if self.config.dry_run:
                table = [["Dry Run"], ["NO CHANGES WILL BE MADE"]]
                self.logger.info(create_table(table))

            output = []

            # Expect self.config.source_dirs to always be present
            if not self.config.source_dirs:
                self.logger.error(
                    f"No source directories provided in config: {self.config.source_dirs}"
                )
                return

            for path in self.config.source_dirs:
                if self.config.log_level.lower() == "debug":
                    print_settings(self.logger, self.config)

                if not os.path.isdir(path):
                    self.logger.error(f"ERROR: path does not exist: {path}")
                    return

                # Find duplicate media files with jdupes
                result = subprocess.getoutput(
                    f"jdupes -r -M -X onlyext:mp4,mkv,avi '{path}' 2>/dev/null"
                )

                # Hardlink duplicates if not dry run and duplicates found
                if not self.config.dry_run:
                    if "No duplicates found." not in result:
                        subprocess.run(
                            f"jdupes -r -L -X onlyext:mp4,mkv,avi '{path}' 2>/dev/null",
                            shell=True,
                        )

                # Parse duplicate files from output
                parsed_files = sorted(
                    set(
                        line.split("/")[-1]
                        for line in result.splitlines()
                        if "/" in line
                    )
                )
                field_message = (
                    "✅ No unlinked files discovered..."
                    if not parsed_files
                    else "❌ Unlinked files discovered..."
                )
                sub_count = len(parsed_files)

                output_data = {
                    "source_dir": path,
                    "field_message": field_message,
                    "output": parsed_files,
                    "sub_count": sub_count,
                }
                output.append(output_data)

            # Print summarized output and send notification
            self.print_output(output)
            manager = NotificationManager(
                self.config, self.logger, module_name="jduparr"
            )
            manager.send_notification(output)

        except KeyboardInterrupt:
            print("Keyboard Interrupt detected. Exiting...")
            sys.exit()
        except Exception:
            self.logger.error("An error occurred:", exc_info=True)
        finally:
            self.logger.log_outro()
