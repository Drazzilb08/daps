import shlex
import json
import sys
from util.config import Config
from util.logger import setup_logger
from util.config import Config
from util.call_script import call_script
from util.discord import get_discord_data, discord_check
from util.utility import create_bar
import pathlib

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
        script_debug = str(settings.get('debug')) if 'debug' in settings else None

        source = str(settings.get('source')) if 'source' in settings else None
        destination = str(settings.get('destination')) if 'destination' in settings else None
        keep_backups = str(settings.get('keep_backups')) if 'keep_backups' in settings else None
        compress = str(settings.get('compress')) if 'compress' in settings else None
        data_dir = str(settings.get('data_dir')) if 'data_dir' in settings else None
        include = list(settings.get('include')) if 'include' in settings else None
        exclude = list(settings.get('exclude')) if 'exclude' in settings else None

        keep_essential = str(settings.get('keep_essential')) if 'keep_essential' in settings else None
        keep_full = str(settings.get('keep_full')) if 'keep_full' in settings else None
        force_full_Backup = str(settings.get('force_full_backup')) if 'force_full_backup' in settings else None
        script_dry_run = str(settings.get('dry_run')) if 'dry_run' in settings else None
        shutdown_plex = str(settings.get('shutdown_plex')) if 'shutdown_plex' in settings else None
        full_backup = str(settings.get('full_backup')) if 'full_backup' in settings else None
        
        logger.debug(f"channel: {channel}")
        logger.debug(f"webhook_url: {webhook_url}")
        logger.debug(f"source: {source}")
        logger.debug(f"destination: {destination}")
        logger.debug(f"keep_backups: {keep_backups}")
        logger.debug(f"compress: {compress}")
        logger.debug(f"keep_essential: {keep_essential}")
        logger.debug(f"keep_full: {keep_full}")
        logger.debug(f"force_full_Backup: {force_full_Backup}")
        logger.debug(f"script_dry_run: {script_dry_run}")
        logger.debug(f"shutdown_plex: {shutdown_plex}")
        logger.debug(f"script_debug: {script_debug}")
        logger.debug(f"full_backup: {full_backup}")
        logger.debug(f"webhook_url: {webhook_url}")
        logger.debug(f"channel: {channel}")
        logger.debug(f"script_name: {script_name}")
        logger.debug(f"settings: {settings}")
        logger.debug(f"bash_script_file: {bash_script_file}")
        logger.debug(f"include: {include}")
        logger.debug(f"exclude: {exclude}")

        if source:
            cmd.append('-s')
            cmd.append(shlex.quote(str(source)))
        if destination:
            cmd.append('-d')
            cmd.append(shlex.quote(str(destination)))
        if keep_backups:
            cmd.append('-k')
            cmd.append(shlex.quote(str(keep_backups)))

        if compress:
            cmd.append('-c')
            cmd.append(shlex.quote(str(compress)))
        
        if webhook_url:
            cmd.append('-w')
            cmd.append(shlex.quote(str(webhook_url)))

        if channel:
            cmd.append('-C')
            cmd.append(shlex.quote(str(channel)))

        if keep_essential:
            cmd.append('-k')
            cmd.append(shlex.quote(str(keep_essential)))

        if keep_full:
            cmd.append('-K')
            cmd.append(shlex.quote(str(keep_full)))

        if force_full_Backup:
            cmd.append('-F')
            cmd.append(shlex.quote(str(force_full_Backup)))

        if full_backup:
            cmd.append('-f')
            cmd.append(shlex.quote(str(full_backup)))

        if script_dry_run:
            cmd.append('-r')
            cmd.append(shlex.quote(str(script_dry_run)))

        if shutdown_plex:
            cmd.append('-S')
            cmd.append(shlex.quote(str(shutdown_plex)))

        if script_debug:
            cmd.append('-D')
            cmd.append(shlex.quote(str(script_debug)))
        
        if data_dir:
            cmd.append('-D')
            cmd.append(shlex.quote(str(data_dir)))
        
        if include:
            quoted_include = ' '.join(shlex.quote(s) for s in include)
            cmd.append('-i')
            cmd.append(quoted_include)
        
        if exclude:
            quoted_exclude = ' '.join(shlex.quote(s) for s in exclude)
            cmd.append('-e')
            cmd.append(quoted_exclude)

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
        

def main(script_name):
    """
    Run the bash script.
    
    Args:
        settings (dict): The settings for the bash script.
        script_name (str): The name of the bash script.
    """
    name = script_name.replace("_", " ").upper()
    log_name = script_name
    settings = None
    try:
        config = Config(script_name="bash_scripts")
        log_level = config.bash_config.get('log_level', 'info')
        for script_setting_key, script_setting_value in config.bash_config.items():
            # If value is a dictionary
            if isinstance(script_setting_value, dict):
                for sub_script_key, v in script_setting_value.items():
                    if script_name == sub_script_key:
                        settings = config.bash_config.get(script_setting_key, {}).get(script_name, {})
                        script_name = script_setting_key
            else:
                settings = config.bash_config.get(script_name, {})
        logger = setup_logger(log_level, log_name)
        logger.info(create_bar(f" START OF {name} "))
        if settings:
            root_dir = pathlib.Path(__file__).parents[1]
            bash_script_file = f'{root_dir}/scripts/{script_name}.sh'
            logger.debug(f"Running: {script_name.capitalize()}")
            cmds = set_cmd_args(settings, bash_script_file, logger, script_name)
            run_script(cmds, logger)
            logger.debug(f"{script_name.capitalize()} complete.")
        else:
            logger.error(f"Script: {script_name} does not exist")
            return
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f" END OF {name} "))

