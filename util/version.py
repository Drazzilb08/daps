import requests
import os
import pathlib
from util.discord import discord


try:
    import requests
except ImportError:
    print("ImportError: requests")
    print("Please install the required modules with 'pip install -r requirements.txt'")
    exit(1)


script_dir = pathlib.Path(__file__).parents[1]  # Get the path to the script directory (one level up from this file

def version_check(logger, branch):
    """
    Check for a new version of the script
    
    Args:
        logger (logger): The logger to use for logging output
        config (dict): The config file
        
    Returns:
        None
    """
    
    # Read version from a local VERSION file
    version_file = os.path.join(script_dir, "VERSION")

    with open(version_file, "r") as f:
        script_version = f.read().strip()
    
    # Construct the URL for the GitHub raw file containing the version
    github_url = f"https://raw.githubusercontent.com/Drazzilb08/userScripts/{branch}/VERSION"
    
    # Send a GET request to the GitHub URL to fetch the script's version from GitHub
    response = requests.get(github_url)

    # Check if the request was successful
    if response.status_code == 200:
        github_script_version = response.text.strip()  # Get the GitHub version
    else:
        logger.error(f"Error: {response.status_code} while retrieving version from {github_url}")
        return

    # Function to compare versions
    def compare_versions(script_version, github_script_version):
        script_version_parts = script_version.split('.')
        github_script_version_parts = github_script_version.split('.')
        for i in range(len(script_version_parts)):
            script_version_part = int(script_version_parts[i])
            github_script_version_part = int(github_script_version_parts[i])

            if script_version_part < github_script_version_part:
                return True  # There is a newer version available
            elif script_version_part > github_script_version_part:
                return False  # The local version is newer
        return False  # The versions are the same or local version is newer

    # Compare the local script version with the version on GitHub
    if compare_versions(script_version, github_script_version):
        logger.warning("New version available")
        logger.warning(f"Current Version: {script_version}")
        logger.warning(f"GitHub Version: {github_script_version}")
        
        # Prepare data for Discord notification
        field = [{
            "name": "New Version Available",
            "value": f""
        },{
            "name": "Current Version",
            "value": f"```{script_version}```"
        }, {
            "name": "GitHub Version",
            "value": f"```{github_script_version}```"
        }]
        
        print("Sending Discord notification")
        # Call function to send Discord notification with script details
        discord(field, logger=logger, script_name="main", description=f"__**Drazzilb's Scripts**__", color=0xff0000, content=None)

def get_version():
    """
    Get the version number from the VERSION file
    
    Args:
        None
        
    Returns:
        str: The version number
    """

    version_file = os.path.join(script_dir, "VERSION")

    with open(version_file, "r") as f:
        script_version = f.read().strip()
    
    return script_version
