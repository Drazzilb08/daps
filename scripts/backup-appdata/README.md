## appdata-backup

### Usage

1. Open a terminal and navigate to the directory where the script is located.
2. Make the script executable:
   <br>`chmod +x script.sh`
3. Edit config file with favorite editor
4. Run script

### This script performs the following actions:

- This is a bash script for creating Docker Container appdata backups
- The backups are saved to a specified destination directory
- The script will determine the appropriate source path for the backup based upon:
  - If the container has a /config mapped to a directory it will use that directory as the appdata path
  - If the container will use a source directory if mapped to:
    - /mnt/user/appdata
    - /mnt/cache/appdata
- The script will determine if a given list of containers are valid containers on the system.
  - If a container is removed from the system or has a typo it will notify the user and remove the entry from the config file
- The script will notify the user of containers that aren't apart of the backup process
  - There are options to add all new containers to the stop and backup option or to the backup without stopping the container
  - There are optiosn to exclude certain containers from any of these processes that might be covered by other scripts (think plex)
- Includes error handling for invalid configurations
- Uses command line tool 7Zip for compression, and it checks if it's installed before running the script

## FAQ:
### Why did you make this script?

For Unraid, the CA appstore has a neat piece of kit that allows for the backup and restoration of docker application data. The only aspect of it that I didn't like at the time of originally making this script was that when it made the backup it put everything into one archive file. Which if you have a very large appdata directory like I do (over 1T of data) then it can take quite a while to pull just one file out of an archive.<br>
So I made this script (based upon [This script](https://github.com/SpartacusIam/unraid-scripts)) which archives each folder and stores it away just in case.

### Why don't you just backup Plex with this script?
Short answer: no reason.<br>
Long answer: Plex being the way it is has a lot of information that you might not deem necessary to backup but sometimes it would be nice to have. If you use this backup script on a very large Plex instance (such as mines). You'd find your self with script that would take quite some time to finish. This is why I mad a seperate Plex backup that could allow for a more refined approach to backing up Plex. 