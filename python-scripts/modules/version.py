import requests
from modules.discord import discord
from datetime import datetime

def version(script_name, script_version, arrpy_py_version, logger, config):
    print(f"script version: {script_version}")
    logger.debug('*' * 40)
    logger.debug(f'* {str(script_name):^36} *')
    logger.debug(f'* {"Script Version:":<2} {str(script_version):>20} *')
    logger.debug(f'* {"arrpy.py Version:":<2} {str(arrpy_py_version):>18} *')
    logger.debug('*' * 40)

    # Construct the URL for the GitHub raw file
    github_url = f"https://raw.githubusercontent.com/Drazzilb08/userScripts/master/python-scripts/{script_name}.py"
    arr_py_url = f"https://raw.githubusercontent.com/Drazzilb08/userScripts/master/python-scripts/modules/arrpy.py"

    # Send a GET request to the GitHub URL
    response = requests.get(github_url)

    # Check if the request was successful
    if response.status_code == 200:
        # Extract the version number from the GitHub file
        github_script_version = None
        for line in response.text.split("\n"):
            if "script_version =" in line or "version =" in line:
                github_script_version = line.split("=")[1].strip().strip('"')  # Remove the quotes
                
    response = requests.get(arr_py_url)
    if response.status_code == 200:
        for line in response.text.split("\n"):
            if "arrpy_py_version =" in line:
                github_arrpy_py_version = line.split("=")[1].strip().strip('"')  # Remove the quotes
                break
    description = "Script version does not match GitHub version, please click the link"
    github_download = f"https://github.com/Drazzilb08/userScripts/archive/refs/heads/master.zip"
    color = 0xff0000
    # Compare the script version with the GitHub version
    if script_version == github_script_version and arrpy_py_version == github_arrpy_py_version:
        logger.debug('*' * 40)
        logger.debug(f'* {"Renamer Cleaner":^36} *')
        logger.debug(f'* {"Script Version:":<2} {script_version:>20} *')
        logger.debug(f'* {"arrpy.py Version:":<2} {arrpy_py_version:>18} *')
        logger.debug('*' * 40)
    elif script_version != github_script_version and arrpy_py_version == github_arrpy_py_version:
        logger.error("Script version does not match GitHub version.")
        logger.error(f"Script version: {script_version}")
        logger.error(f"GitHub version: {github_script_version}")
        logger.error("Please update the script.")
        fields = [
                    {
                        "name": "Script Version",
                        "value": f"```{script_version}```",
                        "inline": False
                    },
                    {
                        "name": "GitHub Version",
                        "value": f"```{github_script_version}```",
                        "inline": False
                    },
                ]
                    
        discord(fields, logger, config, script_name, description, color, github_download)
    elif arrpy_py_version != github_arrpy_py_version and script_version == github_script_version:
        logger.error("Script version does not match GitHub version.")
        logger.error(f"Script version: {arrpy_py_version}")
        logger.error(f"GitHub version: {github_arrpy_py_version}")
        logger.error("Please update the script.")
        fields = [
                    {
                        "name": "arrpy.py Version",
                        "value": f"```{arrpy_py_version}```",
                        "inline": False
                    },
                    {
                        "name": "GitHub Version",
                        "value": f"```{github_arrpy_py_version}```",
                        "inline": False
                    },
                ]
        discord(fields, logger, config, script_name, description, color, github_download)
    else:
        logger.error("Script version does not match GitHub version.")
        logger.error(f"Script version: {script_version}")
        logger.error(f"GitHub version: {github_script_version}")
        logger.error(f"Script version: {arrpy_py_version}")
        logger.error(f"GitHub version: {github_arrpy_py_version}")
        logger.error("Please update the script.")
        fields = [
                        {
                            "name": "Script Version",
                            "value": f"```{script_version}```",
                            "inline": False
                        },
                        {
                            "name": "GitHub Version",
                            "value": f"```{github_script_version}```",
                            "inline": False
                        },
                        {
                            "name": "arrpy.py Version",
                            "value": f"```{arrpy_py_version}```",
                            "inline": False
                        },
                        {
                            "name": "GitHub Version",
                            "value": f"```{github_arrpy_py_version}```",
                            "inline": False
                        },
                    ]
        discord(fields, logger, config, script_name, description, color, github_download)
