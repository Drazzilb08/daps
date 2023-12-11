import requests
from modules.discord import discord
from datetime import datetime
from modules.formatting import create_table

def version(script_name, script_version, arrpy_py_version, logger, config):
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
    if arrpy_py_version:
        response = requests.get(arr_py_url)
        if response.status_code == 200:
            for line in response.text.split("\n"):
                if "arrpy_py_version =" in line:
                    github_arrpy_py_version = line.split("=")[1].strip().strip('"')  # Remove the quotes
                    break
    github_download = "https://github.com/Drazzilb08/userScripts/archive/refs/heads/master.zip"
    description = f"Script version does not match GitHub version, please click the link \n{github_download}\n to download the latest version."
    color = 0xff0000
    script_version_int = int(script_version.replace(".", ""))
    github_script_version_int = int(github_script_version.replace(".", ""))
    if arrpy_py_version:
        arrpy_py_version_int = int(arrpy_py_version.replace(".", ""))
        github_arrpy_py_version_int = int(github_arrpy_py_version.replace(".", ""))
    # Compare the script version with the GitHub version
    data = [
        ["Script Version Data"]
    ]
    if script_version_int == github_script_version_int and arrpy_py_version_int == github_arrpy_py_version_int:
        logger.info("Script version matches GitHub version.")
    elif script_version_int < github_script_version_int and arrpy_py_version_int == github_arrpy_py_version_int:
        fields = build_fields(script_version, github_script_version, None, None)
        logger.error("Script version does not match GitHub version.")
        logger.error("Please update the script.")
        logger.error(version_output(script_version, github_script_version, None, None))
        discord(fields, logger, config, script_name, description, color, content=None)
    elif script_version_int == github_script_version_int and arrpy_py_version_int < github_arrpy_py_version_int:
        logger.error("Script version does not match GitHub version.")
        logger.error("Please update the script.")
        logger.error(version_output(script_version, github_script_version, arrpy_py_version, github_arrpy_py_version))
        fields = build_fields(None, None, arrpy_py_version, github_arrpy_py_version)
        discord(fields, logger, config, script_name, description, color, content=None)
    elif script_version_int < github_script_version_int and arrpy_py_version_int < github_arrpy_py_version_int:
        logger.error("Script version does not match GitHub version.")
        logger.error("Please update the script.")
        logger.error(version_output(script_version, github_script_version, arrpy_py_version, github_arrpy_py_version))
        fields = build_fields(script_version, github_script_version, arrpy_py_version, github_arrpy_py_version)
        discord(fields, logger, config, script_name, description, color, content=None)
    return

def build_fields(script_version=None, github_script_version=None, arrpy_py_version=None, github_arrpy_py_version=None):
    fields = []
    if script_version and github_script_version and arrpy_py_version is None and github_arrpy_py_version is None:
        fields.append({
            "name": "Script Version",
            "value": f"```{script_version}```",
            "inline": False
        })
        fields.append({
            "name": "GitHub Version",
            "value": f"```{github_script_version}```",
            "inline": False
        })
    
    elif arrpy_py_version and github_arrpy_py_version and script_version is None and github_script_version is None:
        fields.append({
            "name": "arrpy.py Version",
            "value": f"```{arrpy_py_version}```",
            "inline": False
        })
        fields.append({
            "name": "GitHub Version",
            "value": f"```{github_arrpy_py_version}```",
            "inline": False
        })
    elif script_version and github_script_version and arrpy_py_version and github_arrpy_py_version:
        fields.append({
            "name": "Script Version",
            "value": f"```{script_version}```",
            "inline": False
        })
        fields.append({
            "name": "GitHub Version",
            "value": f"```{github_script_version}```",
            "inline": False
        })
        fields.append({
            "name": "arrpy.py Version",
            "value": f"```{arrpy_py_version}```",
            "inline": False
        })
        fields.append({
            "name": "GitHub Version",
            "value": f"```{github_arrpy_py_version}```",
            "inline": False
        })
    
    return fields

def version_output(script_version=None, github_script_version=None, arrpy_py_version=None, github_arrpy_py_version=None):
    if script_version and github_script_version and arrpy_py_version is None and github_arrpy_py_version is None:
        data = [
            ["Script Version", "GitHub Version"],
            [script_version, github_script_version]
        ]
    elif arrpy_py_version and github_arrpy_py_version and script_version is None and github_script_version is None:
        data = [
            ["arrpy.py Version", "GitHub Version"],
            [arrpy_py_version, github_arrpy_py_version]
        ]
    elif script_version and github_script_version and arrpy_py_version and github_arrpy_py_version:
        data = [
            ["Script Version", "GitHub Version", "arrpy.py Version", "GitHub Version"],
            [script_version, github_script_version, arrpy_py_version, github_arrpy_py_version]
        ]
    return create_table(data)
