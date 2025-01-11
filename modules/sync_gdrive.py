import json
import os
import shlex
import sys
from pathlib import Path
from typing import Union, List, Optional, Dict

import pydantic

from util.call_script import call_script
from util.constants import OS_NAME
from util.get_sync_file import SyncFileGetter, OsName
from util.logger import setup_logger
from util.utility import create_bar

SCRIPT_NAME = "sync_gdrive"

def output_debug_info(cmd, settings):
    client_id = settings.get('client_id', None)
    client_secret = settings.get('client_secret', None)
    token = settings.get('token', None)
    debug_cmd = cmd.copy()
    if '-i' in debug_cmd:
        debug_cmd[debug_cmd.index('-i') + 1] = '<redacted>' if client_id else 'None'
    if '-s' in debug_cmd:
        debug_cmd[debug_cmd.index('-s') + 1] = '<redacted>' if client_secret else 'None'

    if '-t' in debug_cmd:
        debug_cmd[debug_cmd.index('-t') + 1] = '<redacted>' if token else 'None'

    return debug_cmd

class SyncArgContext(pydantic.BaseModel):
    gdrive_sa_location: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    token: Optional[Dict] = None
    gdrive_sync: Optional[List] = None
    gdrive_okay: bool


def get_sync_args(sync_item: Dict, logger, context: SyncArgContext) -> Union[List, None]:
    # TODO - Note to Mr. Hoorn -> Refactor for SOLID/Clean code & maintainability
    logger.debug(f"Syncing: {sync_item}")
    sync_location = sync_item['location']
    sync_id = sync_item['id']

    sync_cmd = []
    if not context.gdrive_sa_location:
        if context.client_id:
            sync_cmd.append('-i')
            sync_cmd.append(shlex.quote(context.client_id))
        else:
            logger.error("No client id provided")
            return

        if context.client_secret:
            sync_cmd.append('-s')
            sync_cmd.append(shlex.quote(context.client_secret))
        else:
            logger.error("No client secret provided")
            return

    if context.gdrive_sync:
        if sync_location != '' and os.path.exists(sync_location):
            sync_cmd.append('-l')
            sync_cmd.append(shlex.quote(sync_item['location']))
        else:
            if not os.path.exists(sync_location):
                logger.error(f"Sync location {sync_location} does not exist")
                # Create the directory if it doesn't exist
                try:
                    os.makedirs(sync_location)
                    logger.info(f"Created {sync_location}")
                    sync_cmd.append('-l')
                    sync_cmd.append(shlex.quote(sync_item['location']))
                except Exception as e:
                    logger.error(f"Exception occurred while creating {sync_location}: {e}")
                    return
            else:
                logger.error("No sync location provided")
                return
        if sync_id != '':
            sync_cmd.append('-f')
            sync_cmd.append(shlex.quote(sync_item['id']))
        else:
            logger.error("No gdrive id provided")
            return

    if context.token:
        sync_cmd.append('-t')
        sync_cmd.append(json.dumps(context.token))

    if context.gdrive_okay:
        sync_cmd.append('-g')
        sync_cmd.append(shlex.quote(context.gdrive_sa_location))

    return sync_cmd

def get_sync_arg_context(settings, logger) -> SyncArgContext:
    # TODO - Note to Mr. Hoorn -> Refactor for SOLID/Clean code & maintainability

    client_id = settings.get('client_id', None)
    client_secret = settings.get('client_secret', None)
    token = settings.get('token', None)
    gdrive_sa_location = settings.get('gdrive_sa_location', None)
    gdrive_sync = settings.get('gdrive_sync', None)

    if gdrive_sa_location and os.path.isfile(gdrive_sa_location):
        gdrive_okay = True
    elif gdrive_sa_location and not os.path.isfile(gdrive_sa_location):
        gdrive_okay = False
        logger.warning(f"\nGoogle service account file '{gdrive_sa_location}' does not exist\nPlease make sure you have the correct path to the file or remove the path from the config file\n")
    else:
        gdrive_okay = False

    return SyncArgContext(
        gdrive_sa_location=gdrive_sa_location,
        client_id=client_id,
        client_secret=client_secret,
        token=token,
        gdrive_sync=gdrive_sync,
        gdrive_okay=gdrive_okay,
    )

def get_cmds(settings, logger, base_cmd=None, windows: bool = False) -> Union[List[List], None]:
    # TODO - Note to Mr. Hoorn -> Refactor for SOLID/Clean code & maintainability

    if base_cmd is None:
        base_cmd = []
    cmds = []

    context = get_sync_arg_context(settings, logger)

    sync_list: List = context.gdrive_sync if isinstance(context.gdrive_sync, list) else [context.gdrive_sync]

    logger.debug(f"Sync list: {sync_list}")

    for sync_item in sync_list:
        if not windows:
            sync_cmd = get_sync_args(sync_item, logger, context)
            if sync_cmd:
                if base_cmd:
                    cmds.append(base_cmd + sync_cmd)
                else:
                    cmds.append(sync_cmd)
        if windows:
            use_client: bool = context.client_id is not None and context.client_secret is not None and context.token is not None
            use_saf: bool = context.gdrive_sa_location is not None

            if not use_client and not use_saf:
                logger.error("No (client id, client secret), or service account file provided")
                return

            if use_client and use_saf:
                logger.error("Both (client id, client secret), and service account file provided")
                return

            cmd = [
                "rclone sync"
            ]


            if use_client:
                cmd.extend([
                    "--drive-client-id", shlex.quote(context.client_id),
                    "--drive-client-secret", shlex.quote(context.client_secret),
                ])

            if use_saf:
                print("Using service account")
                cmd.extend([
                    "--drive-service-account-file", shlex.quote(context.gdrive_sa_location),
                ])

            cmd.extend([
                "--drive-root-folder-id", shlex.quote(sync_item['id']),
                "--fast-list",
                "--tpslimit=5",
                "--no-update-modtime",
                "--drive-use-trash=false",
                "--drive-chunk-size=512M",
                "--exclude=**.partial",
                "--check-first",
                "--bwlimit=80M",
                "--size-only",
                "--delete-after",
                "--cache-db-purge",
                "--dump-bodies",  # Added this to be sure something is happening... Otherwise it fools me into thinking it's done.
                "-vv",
                "daps:", shlex.quote(sync_item['location'])
            ])
            cmds.append(cmd)

    return cmds

def set_cmd_args(settings, logger):
    get_sync_file: SyncFileGetter = SyncFileGetter(logger)
    path: Union[Path, None] = get_sync_file.get_sync_file()

    if path is not None:
        file_path = str(path.absolute())
    else:
        logger.error("set_cmd_args called for wrong OS version!")
        return

    cmd = [file_path]
    cmds = get_cmds(settings, logger, cmd)

    return cmds

# run the rclone.sh script
def run_rclone(cmd, settings, logger):
    debug_cmd = output_debug_info(cmd, settings)
    try:
        logger.debug(f"RClone command with args: {debug_cmd}")
        call_script(cmd, logger)
        logger.debug(f"RClone command with args: {debug_cmd} --> Success")
    except Exception as e:
        # Note by Mr. Hoorn on 10 January 2025: If there is an exception that the programme returns with exit code 1 (non-0), it will print out the original command without redactions, this is a security issue.
        # I will leave it to someone else to potentially fix this.
        logger.error(f"Exception occurred while running rclone for OS version: {OS_NAME.value}: {e}")

        # This one works as expected. 10 January 2025.
        logger.error(f"RClone command with args: {debug_cmd} --> Failed")
        pass

# Main function
def main(config):
    """
    Main function.
    """
    global dry_run
    settings = config.script_config
    log_level = config.log_level
    logger = setup_logger(log_level, SCRIPT_NAME)
    name = SCRIPT_NAME.replace("_", " ").upper()
    
    try:
        # TODO - Note to Mr. Hoorn (or maybe someone else wants to pick this up):
        #  Integrate executions into a single flow, maybe with strategy pattern,
        #  instead of having different run processes.
        logger.info(create_bar(f"START {name}"))
        if OS_NAME == OsName.LINUX or OS_NAME == OS_NAME.DOCKER:
            for cmd in set_cmd_args(settings, logger):
                run_rclone(cmd, settings, logger)
        elif OS_NAME == OsName.WINDOWS:
            cmds: List[List] = get_cmds(settings, logger, windows=True)
            refresh_path_cmd = '$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")'
            # create_posters_cmd = "rclone config create posters drive config_is_local=false"

            for cmd in cmds:
                # Combine the refresh command and the normal command into a single string
                powershell_path = Path(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe")
                combined_cmd = [powershell_path, f"{refresh_path_cmd}; {', '.join(cmd)}"]
                call_script(combined_cmd, logger)
        else:
            raise Exception("Unsupported OS")
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))