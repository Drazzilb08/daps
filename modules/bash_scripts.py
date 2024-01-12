import shlex
import json
from util.logger import setup_logger
from util.config import Config
from util.call_script import call_script

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
    if settings:
        source = settings.get('source', None)
        destination = settings.get('destination', None)
        keep_backups = settings.get('keep_backups', None)
        compress = settings.get('compress', None)

        keep_essential = settings.get('keep_essential', None)
        keep_full = settings.get('keep_full', None)
        force_full_Backup = settings.get('force_full_backup', None)
        script_dry_run = settings.get('dry_run', None)
        shutdown_plex = settings.get('shutdown_plex', None)
        script_debug = settings.get('debug', None)
        full_backup = settings.get('full_backup', None)
        webhook_url = settings.get('webhook_url', None)
        channel = settings.get('channel', None)

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

        if script_name in ['backup_appdata', 'backup_plex']:
            use_config_file = None
            cmd.append('-x')
            cmd.append(shlex.quote(str(use_config_file)))
    
    cmds.append(cmd)
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
        

def main(settings, script_name):
    """
    Run the bash script.
    
    Args:
        settings (dict): The settings for the bash script.
        script_name (str): The name of the bash script.
    """
    config = Config(script_name="bash_scripts")
    logger = setup_logger(config.log_level, script_name)
    bash_script_file = f'./scripts/{script_name}.sh'
    logger.debug(f"Running: {script_name.capitalize()}")
    cmds = set_cmd_args(settings, bash_script_file, logger, script_name)
    run_script(cmds, logger)
    logger.debug(f"{script_name.capitalize()} complete.")

