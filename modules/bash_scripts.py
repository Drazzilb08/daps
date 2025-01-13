import json
import pathlib
import shlex
import sys

from util.call_script import *
from util.discord import get_discord_data, discord_check
from util.logger import setup_logger
from util.utility import create_bar


def set_cmd_args(settings, bash_script_file, logger, script_name):
    """
    Set the command line arguments for the bash script.

    Args:
        settings (dict): The settings for the bash script.
        bash_script_file (str): The bash script file.
        logger (obj): The logger object.
        script_name (str): The name of the bash script.

    Returns:
        list: A list of commands to run.

    """
    cmds = []
    cmd = [bash_script_file]
    channel = None
    webhook_url = None
    if discord_check(script_name):
        webhook_url, channel = get_discord_data(script_name, logger)
    if settings:

        source = str(settings.get('source')) if 'source' in settings else None
        data_dir = str(settings.get('data_dir')) if 'data_dir' in settings else None
        include = list(settings.get('include')) if 'include' in settings else None
        exclude = list(settings.get('exclude')) if 'exclude' in settings else None
        silent = settings.get('silent') if 'silent' in settings else None

        logger.debug(f"channel: {channel}")
        logger.debug(f"webhook_url: {webhook_url}")
        logger.debug(f"source: {source}")
        logger.debug(f"webhook_url: {webhook_url}")
        logger.debug(f"channel: {channel}")
        logger.debug(f"script_name: {script_name}")
        logger.debug(f"settings: {settings}")
        logger.debug(f"bash_script_file: {bash_script_file}")
        logger.debug(f"include: {include}")
        logger.debug(f"exclude: {exclude}")
        logger.debug(f"Silent: {silent}")

        if source:
            cmd.append('-s')
            cmd.append(shlex.quote(str(source)))
        
        if webhook_url:
            cmd.append('-w')
            cmd.append(shlex.quote(str(webhook_url)))

        if channel:
            cmd.append('-C')
            cmd.append(shlex.quote(str(channel)))

        if silent is not None:
            cmd.append('-S')
            cmd.append(shlex.quote(str(silent)))

        if data_dir:
            cmd.append('-D')
            cmd.append(shlex.quote(str(data_dir)))
        
        if include:
            include = ",".join([f"{i}" for i in include])
            cmd.append('-i')
            cmd.append(include)
        
        if exclude:
            exclude = ",".join([f"{i}" for i in exclude])
            cmd.append('-e')
            cmd.append(exclude)

        if script_name in ['backup_appdata', 'backup_plex']:
            use_config_file = None
            cmd.append('-x')
            cmd.append(shlex.quote(str(use_config_file)))
    cmds.append(cmd)
    logger.debug(json.dumps(cmds, indent=4))
    return cmds

def run_script(cmds, logger):
    """
    Run the bash script.
    
    Args:
        cmds (list): A list of commands to run.
        logger (obj): The logger object.
    """
    for cmd in cmds:
        try:
            logger.debug(f"Running command: {cmd}")
            call_script(cmd, logger)
        except Exception as e:
            logger.error(f"Error running command: {cmd}")
            logger.error(e)
            return

def main(script_name, config):
    """
    Run the bash script.
    
    Args:
        settings (dict): The settings for the bash script.
        script_name (str): The name of the bash script.
    """
    name = script_name.replace("_", " ").upper()
    log_level = config.log_level
    logger = setup_logger(log_level, script_name)
    settings = None
    try:
        for script_setting_key, script_setting_value in config.bash_config.items():
            # If value is a dictionary
            if isinstance(script_setting_value, dict):
                for sub_script_key, v in script_setting_value.items():
                    if script_name == sub_script_key:
                        settings = config.bash_config.get(script_setting_key, {}).get(script_name, {})
                        script_name = script_setting_key
            else:
                settings = config.bash_config.get(script_name, {})
        logger.info(create_bar(f" START OF {name} "))
        root_dir = pathlib.Path(__file__).parents[1]
        bash_script_file = f'{root_dir}/scripts/{script_name}.sh'
        if settings:
            logger.debug(f"Running: {script_name.capitalize()}")
            cmds = set_cmd_args(settings, bash_script_file, logger, script_name)
            run_script(cmds, logger)
            logger.debug(f"{script_name.capitalize()} complete.")
        elif script_name in ['backup_appdata']:
            settings = {}
            logger.debug(f"Running: {script_name.capitalize()}")
            cmds = set_cmd_args(settings, bash_script_file, logger, script_name)
            run_script(cmds, logger)
            logger.debug(f"{script_name.capitalize()} complete.")
        else:
            logger.error(f"Script: {script_name} does not have a valid configuration. Exiting...")
            return
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f" END OF {name} "))

