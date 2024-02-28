import os
import json
import sys
from datetime import datetime
import docker
from docker.errors import DockerException
import subprocess
import shutil
import tarfile
import tempfile
import fnmatch
import pathlib

from util.utility import *
from util.logger import setup_logger
from util.discord import *

script_name = "backup_appdata"


def filter_containers(containers, add_to_no_stop, add_to_stop, stop_list, no_stop_list, exclusion_list, appdata_paths, logger):
    """
    Filter containers based on stop_list, no_stop_list, and exclusion_list

    Args:
        containers (list): List of docker containers
        add_to_no_stop (bool): Add to start list
        add_to_stop (bool): Add to stop list
        stop_list (list): List of containers to stop
        no_stop_list (list): List of containers to not stop
        exclusion_list (list): List of containers to exclude
        appdata_paths (list): List of appdata paths

    Returns:
        dict: Dictionary of containers
    """

    # Get all containers from config
    all_containers = []
    if stop_list:
        all_containers += stop_list
    if no_stop_list:
        all_containers += no_stop_list
    if exclusion_list:
        all_containers += exclusion_list
    
    # Get all containers that need to be removed
    containers_to_remove = [container for container in all_containers if container not in [container.name for container in containers]]

    # Remove containers from config if they are not in the system
    if containers_to_remove:
        if not dry_run:
            config.remove_from_config(containers_to_remove, logger)
        else:
            for container in containers_to_remove:
                logger.info(f"DRY RUN: Would have removed {container} from config")

    containers_dict = {}

    # Loop through containers from host
    for container in containers:
        appdata_path = None
        exclude = False
        
        # Check if container is in stop_list, no_stop_list, or exclusion_list
        if stop_list and container.name in stop_list:
            stop = True
        elif no_stop_list and container.name in no_stop_list:
            stop = False
        elif exclusion_list and container.name in exclusion_list:
            exclude = True

        # Get container volume mounts
        volume_mounts = container.attrs["HostConfig"]["Binds"]

        # Get appdata path
        if volume_mounts:
            appdata_path = None
            for volume_mount in volume_mounts:
                host_path = volume_mount.split(":")[0]
                container_path = volume_mount.split(":")[1]
                if container_path == "/config" and any(host_path.startswith(path) for path in appdata_paths):
                    appdata_path = host_path
                    break
                if not appdata_path:
                    for path in appdata_paths:
                        if host_path.startswith(path):
                            directories = host_path.split(os.sep)
                            index = directories.index("appdata")
                            next_directory = directories[index + 1]
                            if next_directory:
                                appdata_path = os.path.join(path, next_directory)
                            break
        else:
            logger.debug(f"No volume mounts for {container.name}")

        logger.debug(create_bar("Container Host data"))
        logger.debug(f"Container Name: {container.name}")
        logger.debug(f"Host Appdata Path: {appdata_path}")
        logger.debug(f"Volume Mounts:\n{json.dumps(volume_mounts, indent=4)}")
        appdata_path_basename = None
        if os.environ.get("DOCKER_ENV") and appdata_path:
            # Get appdata path from environment variable
            
            docker_appdata_path = os.environ.get("APPDATA_PATH")
            
            # Remove trailing / from appdata path
            appdata_path = appdata_path.rstrip("/")

            # Get appdata basename
            appdata_path_basename = os.path.basename(appdata_path)

            # Get container Hostname
            host_container_name = os.environ.get('HOSTNAME')

            # Merge docker_appdata_path with appdata_path_basename
            appdata_path = os.path.join(docker_appdata_path, appdata_path_basename)

            # Join appdata path with docker appdata path
            if docker_appdata_path:
                appdata_path = os.path.join(docker_appdata_path, appdata_path_basename)
            logger.debug(f"Docker Appdata Path: {appdata_path}")
        logger.debug(create_bar("-"))
        
        new = False
        stop = None

        if not dry_run:

            # Add to config if not in config
            if add_to_no_stop and container.name not in all_containers and appdata_path:
                config.add_to_config(add_type="no_stop", container=container, logger=logger)
                stop = False
                new = True
            elif add_to_stop and container.name not in all_containers and appdata_path:
                config.add_to_config(add_type = "stop", container=container, logger=logger)
                stop = True
                new = True
            elif not appdata_path and container.name not in all_containers:
                config.add_to_config(add_type="exclude", container=container, logger=logger, message = "# Container automatically added here due to no appdata dir")
                exclude = True
                new = True
            elif stop_list and container.name in stop_list:
                stop = True
            elif no_stop_list and container.name in no_stop_list:
                stop = False
            elif exclusion_list and container.name in exclusion_list:
                exclude = True
        else:
            if add_to_no_stop and container.name not in all_containers and appdata_path:
                logger.info(f"DRY RUN: Would have added {container.name} to no stop list")
                stop = False
                new = True
            elif add_to_stop and container.name not in all_containers and appdata_path:
                logger.info(f"DRY RUN: Would have added {container.name} to no stop list")
                stop = True
                new = True
            elif not appdata_path and container.name not in all_containers:
                logger.info(f"DRY RUN: Would have added {container.name} to no stop list")
                exclude = True
                new = True
            elif stop_list and container.name in stop_list:
                stop = True
            elif no_stop_list and container.name in no_stop_list:
                stop = False
            elif exclusion_list and container.name in exclusion_list:
                exclude = True
        
        # Check if host_container_name is set and container name is the same as host_container_name
        # If it is, then do not stop the container
        if host_container_name and container.short_id == host_container_name:
            logger.info(f"Container {container.name} is the same as host container. Not stopping it.")
            stop = False

        # Add to dictionary
        containers_dict[container.name] = {
            "id": container.short_id,
            "stop": stop,
            "exclude": exclude,
            "appdata_path": appdata_path,
            "new": new
        }
    return containers_dict, containers_to_remove

def get_size_format(bytes, factor=1024, suffix="B"):
    """
    Convert bytes to human readable format
    
    Args:
        bytes (int): Bytes
        factor (int): Factor
        suffix (str): Suffix
        
    Returns:
        str: Human readable format
    """

    for unit in ["", "K", "M", "G", "T", "P", "E", "Z"]:
        if bytes < factor:
            return f"{bytes:.2f}{unit}{suffix}"
        bytes /= factor
    return f"{bytes:.2f}Y{suffix}"

def get_folder_size(folder_path):
    """
    Get folder size
    
    Args:
        folder_path (str): Folder path
        
    Returns:
        str: Folder size
    """
    total = 0
    if folder_path:
        print(f"Getting size of {folder_path}")
        for dirpath, dirnames, filenames in os.walk(folder_path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    total += os.path.getsize(fp)
        return total
    else:
        return 0

def ignore_patterns_and_subdirectories(patterns):
    def _ignore_patterns_and_subdirectories(dirname, filenames):
        ignore = set(name for pattern in patterns for name in filenames if fnmatch.fnmatch(name, pattern))
        ignore.update(name for name in filenames if any(fnmatch.fnmatch(os.path.join(dirname, name), pattern) for pattern in patterns))
        return ignore
    return _ignore_patterns_and_subdirectories

def add_to_tar(tar, path, arcname, ignore=None):
    for root, dirs, files in os.walk(path):
        if ignore is not None:
            ignored_names = ignore(root, files + dirs)
            files = [name for name in files if name not in ignored_names]
            dirs[:] = [name for name in dirs if name not in ignored_names]

        for file in files:
            full_path = os.path.join(root, file)
            tar.add(full_path, arcname=os.path.join(arcname, file))

def backup_appdata(container_name, appdata_path, destination, compress, dry_run, time, logger):
    """
    Backup appdata

    Args:
        appdata_path (str): Appdata path
        destination (str): Destination folder
        compress (bool): Compress backup
        dry_run (bool): Dry run
    """
    
    pre_size = None
    backup_path = os.path.join(destination, time)
    os.makedirs(backup_path, exist_ok=True)
    pre_size = get_folder_size(appdata_path)
    # Script parent directory
    parent_dir = os.path.join(pathlib.Path(__file__).parents[1])
    exclude_file = f"{parent_dir}/exclude-file.txt"
    with open(exclude_file, "r") as f:
        exclude_patterns = f.read().splitlines()
    ignore = ignore_patterns_and_subdirectories(exclude_patterns)
    if not dry_run:
        if compress:
            logger.info(f"Compressing {appdata_path} to {backup_path}")

            # Create temporary file
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_file_path = f"{temp_dir}/{container_name}.tar.gz"
                file_path = os.path.join(backup_path, f"{container_name}.tar.gz")

                # Compress appdata
                with tarfile.open(temp_file_path, "w:gz") as tar:
                    add_to_tar(tar, appdata_path, os.path.basename(appdata_path), ignore)
                
                temp_size = get_folder_size(temp_file_path)

                # Move from temp to destination if temp_size is smaller
                if temp_size < pre_size:
                    shutil.move(temp_file_path, file_path)
                # Copy from appdata to destination if temp_size is larger
                else:
                    file_path = os.path.join(backup_path, f"{container_name}.tar")
                    logger.info(f"Compressed file size is larger than original. Creating tarball of {appdata_path} in {backup_path}")
                    with tarfile.open(file_path, "w") as tar:
                        add_to_tar(tar, appdata_path, os.path.basename(appdata_path), ignore)

                # Remove temporary file
                shutil.rmtree(temp_dir)
        else:
            logger.info(f"Copying {appdata_path} to {backup_path}")
            file_path = os.path.join(backup_path, f"{container_name}.tar")
            with tarfile.open(file_path, "w") as tar:
                add_to_tar(tar, appdata_path, os.path.basename(appdata_path), ignore)
            
    else:
        logger.info(f"DRY RUN: Would have copied {appdata_path} to {backup_path}")
        logger.info(f"Creating dummy file in {backup_path}")
        if compress:
            dummy_file_name = f"dummy_{container_name}.tar.gz"
        else:
            dummy_file_name = f"dummy_{container_name}.tar"
        file_path = os.path.join(backup_path, dummy_file_name)

        # Create dummy file
        subprocess.run(["touch", file_path])

    # Get size statistics
    post_size = os.path.getsize(file_path)
    pre_size_str = get_size_format(pre_size)
    post_size_str = get_size_format(post_size)
    diff_str = get_size_format(pre_size - post_size)


    # add prefix to diff_str if negative (-) and (+) for positive
    if pre_size - post_size < 0:
        # Remove negative sign
        diff_str = diff_str[1:]
        diff_str = f"+{diff_str}"
    elif pre_size - post_size > 0:
        diff_str = f"-{diff_str}"

    table = [
        ["Source", pre_size_str],
        ["Backup Size", post_size_str],
        ["Difference", f"{diff_str}"]
    ]
    logger.info(create_table(table))

    return pre_size_str, post_size_str, diff_str


def handle_container(client, containers_dict, destination, dry_run, compress, keep_backup, logger):
    """
    Backup docker containers

    Args:
        containers_dict (dict): Dictionary of containers
        destination (str): Destination folder
        dry_run (bool): Dry run
        compress (bool): Compress backup

    Returns:
        list: list of items backed up
    """
    time = f"{datetime.now().strftime('%Y-%m-%d@%H.%M')}"
    for container_name, container_data in containers_dict.items():
        container_id = container_data["id"]
        stop = container_data["stop"]
        exclude = container_data["exclude"]
        appdata_path = container_data["appdata_path"]
        current_state = client.containers.get(container_id).status
        if not exclude:
            logger.info(create_bar(f"Backing up {container_name}..."))
            if stop:
                if current_state == "running":
                    container = client.containers.get(container_id)
                    if not dry_run:
                        logger.info(f"Stopping {container_name}...")
                        container.stop()
                    else:
                        logger.info(f"DRY RUN: Would have stopped {container_name}")
                    pre_size_str, post_size_str, diff_str = backup_appdata(container_name, appdata_path, destination, compress, dry_run, time, logger)
                    if not dry_run:
                        logger.info(f"Starting {container_name}...")
                        container.start()
                    else:
                        logger.info(f"DRY RUN: Would have started {container_name}")
                else:
                    logger.info(f"{container_name} was already stopped, not starting...")
                    pre_size_str, post_size_str, diff_str = backup_appdata(container_name, appdata_path, destination, compress, dry_run, time, logger)
            elif not stop:
                logger.info(f"Backing up {container_name} without stopping it...")
                pre_size_str, post_size_str, diff_str = backup_appdata(container_name, appdata_path, destination, compress, dry_run, time, logger)

            # Add size data to dictionary
            containers_dict[container_name]["pre_size"] = pre_size_str
            containers_dict[container_name]["post_size"] = post_size_str
            containers_dict[container_name]["diff"] = diff_str

            logger.info(create_bar(f"Backup of {container_name} complete"))
    # Keep only the last keep_backup number of backups
    if not dry_run:
        all_backups = os.listdir(destination)
        all_backups.sort()
        if len(all_backups) > keep_backup:
            logger.info(f"Removing old backups...")
            for backup in all_backups[:-keep_backup]:
                if backup.startswith("."):
                    continue
                logger.info(f"Removing {backup}")
                shutil.rmtree(os.path.join(destination, backup))
    else:
        logger.info(f"DRY RUN: Would have removed old backups...")
        
    path = os.path.join(destination, time)
    total_size = get_folder_size(path)
    total_size_str = get_size_format(total_size)
    containers_dict["total_size_str"] = total_size_str
    return containers_dict

def split_message(message, max_length=1000):
    parts = []
    while len(message) > max_length:
        split_index = message.rfind('\n', 0, max_length)
        part = message[:split_index]
        message = message[split_index+1:]
        parts.append(part)
    parts.append(message)
    return parts

def default_fields(runtime, total_size_str, all_backups_size_str):
    return [{
            "name": "Runtime:", 
            "value": f"```{runtime}```"
        }, 
        {
            "name": "Total size of all appdata backups today:", 
            "value": f"```{total_size_str}```"
        }, 
        {
            "name": "Total size of all appdata backups:", 
            "value": f"```{all_backups_size_str}```"
        }]
    
def notification(containers_dict, script_name, use_summary, containers_to_remove, logger):
    """
    Send notification

    Args:
        containers_dict (dict): Dictionary of containers
        script_name (str): Script name
        use_summary (bool): Use summary
    """
    discord_dict = {
        'new_containers': [],
        'removed_containers': [],
        'container_messages': [],
        'no_summary': []
    }

    stop_messages = []
    no_stop_messages = []
    new_container_messages = []
    runtime = containers_dict.get("run_time", None)
    total_size_str = containers_dict.get("total_size_str", None)
    add_to_no_stop = containers_dict.get("add_to_no_stop", None)
    all_backups_size_str = containers_dict.get("all_backups_size_str", None)
    
    # Remove items from dictionary
    containers_dict.pop("run_time", None)
    containers_dict.pop("total_size_str", None)
    containers_dict.pop("size", None)
    containers_dict.pop("add_to_no_stop", None)
    containers_dict.pop("all_backups_size_str", None)


    for container_name, container_data in containers_dict.items():
        stop = container_data.get("stop", None)
        pre_size = container_data.get("pre_size", None)
        post_size = container_data.get("post_size", None)
        diff = container_data.get("diff", None)
        new = container_data.get("new", None)

        if new:
            new_container_messages.append(container_name)
        elif stop and use_summary:
            stop_messages.append(f"{container_name}\n\tPre Size: {pre_size}\n\tPost Size: {post_size}\n\tDifference: {diff}")
        elif stop == False and use_summary:
            no_stop_messages.append(f"{container_name}\n\tPre Size: {pre_size}\n\tPost Size: {post_size}\n\tDifference: {diff}")

    # Create fields for new containers
    if new_container_messages:
            new_container_message = "\n".join(new_container_messages)
            new_container_message_parts = split_message(new_container_message)
            for i, part in enumerate(new_container_message_parts):
                field = {
                    "value": f"```\n{part}```"
                }
                if i == 0:
                    field["name"] = "New Containers"
                discord_dict['new_containers'].append(field)
    
    # Create fields for removed containers
    if containers_to_remove:
        removed_container_message = "\n".join(containers_to_remove)
        removed_container_message_parts = split_message(removed_container_message)
        for i, part in enumerate(removed_container_message_parts):
            field = {
                "value": f"```\n{part}```"
            }
            if i == 0:
                field["name"] = "Removed Containers"
            discord_dict['removed_containers'].append(field)
    
    if use_summary:
        # Create fields for stop containers
        if stop_messages:
            stop_message = "\n".join(stop_messages)
            stop_message_parts = split_message(stop_message)
            for i, part in enumerate(stop_message_parts):
                field = {}
                if i == 0:
                    field["name"] = "Stop Containers"
                field['value'] = f"```\n{part}```"
                discord_dict['container_messages'].append(field)
        
        # Create fields for no stop containers
        if no_stop_messages:
            no_stop_message = "\n".join(no_stop_messages)
            no_stop_message_parts = split_message(no_stop_message)
            for i, part in enumerate(no_stop_message_parts):
                field = {}
                if i == 0:
                    field["name"] = "No Stop Containers"
                field['value'] = f"```\n{part}```"
                discord_dict['container_messages'].append(field)
    
    # Create fields for default fields
    for field in default_fields(runtime, total_size_str, all_backups_size_str):
        for key, values in discord_dict.items():
            if key == "new_containers" or key == "removed_containers":
                continue
            if not use_summary:
                discord_dict['no_summary'].append(field)
                break
            if values:
                discord_dict[key].insert(0, field)
    
    logger.debug(f"Discord Dictionary:\n{json.dumps(discord_dict, indent=4)}")
    
    # Send notification
    for type, fields in discord_dict.items():
        if fields:
            dry_run_str = f"**__DRY RUN:__**\n" if dry_run else ""
            if type == "new_containers" and fields:
                if add_to_no_stop:
                    description = f"{dry_run_str}Your config file has been edited:\nNew containers have been added to the no stop list."
                else:
                    description = f"{dry_run_str}Your config file has been edited:\nNew containers have been added to the stop list."
                fields.append({
                    "name": "If you wish to change this you'll need to update your config file manually:",
                    "value": ""
                })
            elif type == "removed_containers" and fields:
                description = f"{dry_run_str}Your config file has been edited:\nContainers have been removed from the system and have been removed from your config file."
            else:
                description = f"{dry_run_str}Backup of appdata has been completed."
            
            discord(fields=fields, logger=logger, script_name=script_name, description=description, color=0x00ff00, content=None)


def main(config):
    """
    Main function.
    """
    global dry_run
    dry_run = config.dry_run
    log_level = config.log_level
    logger = setup_logger(log_level, script_name)
    script_config = config.script_config

    name = script_name.replace("_", " ").upper()
    start = datetime.now()
    try:
        
        client = docker.from_env()
        
        logger.info(create_bar(f"START {name}"))
        # Display script settings
        table = [["Script Settings"]]
        logger.debug(create_table(table))
        destination = script_config.get('destination', None)
        keep_backup = script_config.get('keep_backup', 5)
        compress = script_config.get('compress', False)
        add_to_stop = script_config.get('add_to_stop', False)
        add_to_no_stop = script_config.get('add_to_no_stop', False)
        use_summary = script_config.get('use_summary', False)
        stop_list = script_config.get('stop_list', [])
        no_stop_list = script_config.get('no_stop_list', [])
        exclusion_list = script_config.get('exclusion_list', [])
        appdata_paths = script_config.get('appdata_paths', [])

        # Display script settings
        logger.debug(create_bar("-"))  # Log separator
        logger.debug(f'{"Dry_run:":<20}{dry_run}')
        logger.debug(f'{"Log level:":<20}{log_level}')
        logger.debug(f'{"Destination:":<20} {destination}')
        logger.debug(f'{"Keep Backup:":<20} {keep_backup}')
        logger.debug(f'{"Compress:":<20} {compress}')
        logger.debug(f'{"Add to Stop:":<20} {add_to_stop}')
        logger.debug(f'{"Add to No Stop:":<20} {add_to_no_stop}')
        logger.debug(f'{"Stop List:":<20} {stop_list}')
        logger.debug(f'{"Use Summary:":<20} {use_summary}')
        logger.debug(f'{"No Stop List:":<20} {no_stop_list}')
        logger.debug(f'{"Exclusion List:":<20} {exclusion_list}')
        logger.debug(f'{"Appdata Paths:":<20} {appdata_paths}')

        # Check add_to_stop and add_to_no_stop
        if add_to_stop and add_to_no_stop or not add_to_stop and not add_to_no_stop:
            logger.error("Cannot add to both stop and start. Please choose one.")
            sys.exit()

        # Check if destination folder exists
        if not os.path.exists(destination) and not dry_run:
            logger.info(f"Destination folder does not exist. Creating {destination}")
            os.makedirs(destination)
        else:
            logger.debug(f"Destination folder exists: {destination}")
        
        logger.debug(create_bar("-"))  # Log separator

        if dry_run:
            table = [
                ["Dry Run"],
                ["NO CHANGES WILL BE MADE"]
            ]
            logger.info(create_table(table))

        # Get list of docker containers
        containers = client.containers.list(all=True)

        # Filter containers
        containers_dict, containers_to_remove = filter_containers(containers, add_to_no_stop, add_to_stop, stop_list, no_stop_list, exclusion_list, appdata_paths, logger)

        # Backup containers
        if containers_dict:
            logger.debug(f"Containers Dictionary:\n{json.dumps(containers_dict, indent=4)}")
            containers_dict = handle_container(client, containers_dict, destination, dry_run, compress, keep_backup, logger)
        else:
            logger.debug("No containers to backup")
        end = datetime.now()
        run_time = end - start
        # Add run time to dictionary
        logger.debug(f"Container info:\n{json.dumps(containers_dict, indent=4)}")

        # Get run time
        hours = run_time.seconds // 3600
        minutes = (run_time.seconds % 3600) // 60
        seconds = run_time.seconds % 60
        run_time_str = ""
        if hours > 0:
            run_time_str += f"{hours} hours, "
        if minutes > 0:
            run_time_str += f"{minutes} minutes, "
        run_time_str += f"{seconds} seconds"
        run_time_str = run_time_str.rstrip(", ")

        # Get all backups size
        all_backups_size = get_folder_size(destination)
        all_backups_size_str = get_size_format(all_backups_size)

        # Add run time and all backups size to dictionary
        containers_dict["run_time"] = run_time_str
        containers_dict['add_to_no_stop'] = add_to_no_stop
        containers_dict['all_backups_size_str'] = all_backups_size_str

        table = [
            ["Summary"],
        ]
        logger.info(create_table(table))
        logger.info(f"Total Size of all backups: {containers_dict['total_size_str']}")
        logger.info(f"Script ran for {run_time_str}")
        logger.info(f"All backups size: {all_backups_size_str}")
        if discord_check(script_name):
            notification(containers_dict, script_name, use_summary, containers_to_remove, logger)
            
    except KeyboardInterrupt:
        print("Keyboard Interrupt detected. Exiting...")
        sys.exit()
    except DockerException as e:
            logger.error(f"\nChances are your docker daemon is not running. Please start it and try again.")
            logger.error(f"Error connecting to Docker: {e}\n")
            sys.exit()
    except Exception:
        logger.error(f"\n\nAn error occurred:\n", exc_info=True)
        logger.error(f"\n\n")
    finally:
        logger.info(create_bar(f"END {name}"))