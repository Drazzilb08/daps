## folder-backup

### Usage
  1. Open a terminal and navigate to the directory where the script is located.
  2. Make the script executable:
    <br>`chmod +x script.sh`
  3. Run script with custom options:
    <br>`./backup.sh -s /path/to/source -d /path/to/destination -c -k 5 -u -w https://discord.com/api/webhooks/ -n "Backup Bot" -b 3036236`

```
Options :
-s --source : Set the source directory to backup
-d --destination : Set the destination directory to save the backup
-c --compress : Use compression on the backup file (default: false)
-k --keep-backup : Number of backups to keep (default: 2)
-u --unraid-notify : Use unRAID notifications for backup status (default: false)
-q --quiet : Run script without displaying output
-w --discord : Use Discord notifications for backup status (default: false)
-n --bot-name : Set the bot name for discord notifications (default: Notification Bot)
-b --bar-color : Set the bar color for discord notifications supports Hex or Decimal colors (default: 16776960)
-h --help : Show this help message
```

### This script performs the following actions:
* This is a bash script for creating backups of a specified source directory
* The backups are saved to a specified destination directory
* Has options for compression, keeping a certain number of backups, and sending notifications to Discord or unRAID
* Includes error handling for invalid configurations
* Help function to display usage instructions
* Uses command line tool 7Zip for compression, and it checks if it's installed before running the script