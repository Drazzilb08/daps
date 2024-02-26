import shlex
import json
import os

from util.call_script import call_script
from util.utility import create_bar
import sys


script_name = "sync_gdrive"

bash_script_file = os.path.realpath(os.path.dirname(os.path.realpath(__file__)) + '/../scripts/rclone.sh')

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

def set_cmd_args(settings, logger):
    cmds = []
    cmd = [bash_script_file]
    sync_list = []
    client_id = settings.get('client_id', None)
    client_secret = settings.get('client_secret', None)
    token = settings.get('token', None)
    gdrive_sa_location = settings.get('gdrive_sa_location', None)
    gdrive_sync = settings.get('gdrive_sync', None)

    sync_list = gdrive_sync if isinstance(gdrive_sync, list) else [gdrive_sync]

    if gdrive_sa_location and os.path.isfile(gdrive_sa_location):
        gdrive_okay = True
    elif gdrive_sa_location and not os.path.isfile(gdrive_sa_location):
        gdrive_okay = False
        logger.warning(f"\nGoogle service account file '{gdrive_sa_location}' does not exist\nPlease make sure you have the correct path to the file or remove the path from the config file\n")
    else:
        gdrive_okay = False

    logger.debug(f"Sync list: {sync_list}")
    for sync_item in sync_list:
        logger.debug(f"Syncing: {sync_item}")
        sync_location = sync_item['location']
        sync_id = sync_item['id']

        sync_cmd = cmd.copy()
        if client_id:
            sync_cmd.append('-i')
            sync_cmd.append(shlex.quote(client_id))
        else:
            logger.error("No client id provided")
            return

        if client_secret:
            sync_cmd.append('-s')
            sync_cmd.append(shlex.quote(client_secret))
        else:
            logger.error("No client secret provided")
            return

        if gdrive_sync:
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
        
        if token:
            sync_cmd.append('-t')
            sync_cmd.append(json.dumps(token))

        if gdrive_okay:
            sync_cmd.append('-g')
            sync_cmd.append(shlex.quote(gdrive_sa_location))

        cmds.append(sync_cmd)

    return cmds

# run the rclone.sh script
def run_rclone(cmd, settings, logger):
    debug_cmd = output_debug_info(cmd, settings)
    try:
        logger.debug(f"RClone command with args: {debug_cmd}")
        call_script(cmd, logger)
        logger.debug(f"RClone command with args: {debug_cmd} --> Success")
    except Exception as e:
        logger.error(f"Exception occurred while running rclone.sh: {e}")
        logger.error(f"RClone command with args: {debug_cmd} --> Failed")
        pass

# Main function
def main(logger, config):
    """
    Main function.
    """
    global dry_run
    dry_run = config.dry_run
    log_level = config.log_level
    logger.setLevel(log_level.upper())
    name = script_name.replace("_", " ").upper()
    
    try:
        logger.info(create_bar(f"START {name}"))
        settings = config.script_config
        for cmd in set_cmd_args(settings, logger):
            run_rclone(cmd, settings, logger)
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))