import shlex
import json
from util.logger import setup_logger
from util.config import Config
from util.call_script import call_script

config = Config(script_name="sync_gdrive")
logger = setup_logger(config.log_level, "sync_gdrive")
bash_script_file = './scripts/rclone.sh'

def output_debug_info(cmd, settings) -> list[str]:
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

def set_cmd_args(settings) -> list[list[str]]:
    cmds = []
    cmd = [bash_script_file]
    sync_list = []
    client_id = settings.get('client_id', None)
    client_secret = settings.get('client_secret', None)
    token = settings.get('token', None)
    gdrive_sa_location = settings.get('gdrive_sa_location', None)
    gdrive_sync = settings.get('gdrive_sync', None)

    if not gdrive_sync:
        sync_list.append(1)
    else:
        sync_list = gdrive_sync

    logger.debug(f"Sync list: {sync_list}")
    for sync_item in sync_list:
        logger.debug(f"Syncing: {sync_item}")
        sync_cmd = cmd.copy()
        if client_id:
            sync_cmd.append('-i')
            sync_cmd.append(shlex.quote(client_id))
        else:
            logger.error("No client id provided")
            exit(1)

        if client_secret:
            sync_cmd.append('-s')
            sync_cmd.append(shlex.quote(client_secret))
        else:
            logger.error("No client secret provided")
            exit(1)

        if gdrive_sync:
            if sync_item['location'] != '':
                sync_cmd.append('-l')
                sync_cmd.append(shlex.quote(sync_item['location']))
            else:
                logger.error("No sync location provided")
                exit(1)
            if sync_item['id'] != '':
                sync_cmd.append('-f')
                sync_cmd.append(shlex.quote(sync_item['id']))
            else:
                logger.error("No gdrive id provided")
                exit(1)
        
        if token:
            sync_cmd.append('-t')
            sync_cmd.append(json.dumps(token))

        if gdrive_sa_location:
            sync_cmd.append('-g')
            sync_cmd.append(shlex.quote(gdrive_sa_location))

        cmds.append(sync_cmd)

    return cmds

# run the rclone.sh script
def run_rclone(cmd, settings):
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
def main():
    settings = config.script_config
    logger.info("Running sync_gdrive")
    for cmd in set_cmd_args(settings):
        run_rclone(cmd, settings)
    logger.info(f"{'*' * 40} END {'*' * 40}\n")