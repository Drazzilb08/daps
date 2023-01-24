## plex-backup

### Usage
  1. Open a terminal and navigate to the directory where the script is located.
  2. Make the script executable:
    <br>`chmod +x script.sh`
  3. Run script with custom options:
    <br>`./backup.sh -s /path/to/source -d /path/to/destination -c -k 5 -u -w https://discord.com/api/webhooks/ -n "Backup Bot" -b ff00ff`

```
Options :
    -s    --source <dir>               : Source directory to backup"
    -d    --destination <dir>          : Destination directory to store backups"
    -F    --force-full <days>          : Number of days to wait before forcing a full backup"
    -f    --full-backup                : Perform full backup"
    -k    --keep-essential <num>       : Number of essential backups to keep"
    -K    --keep-full <num>            : Number of full backups to keep"
    -c    --compress                   : Compress backups using 7zip"
    -u    --unraid-notify              : Send notification to Unraid webGui"
    -q    --quiet                      : Quiet mode"
    -w    --webhook <url>              : Webhook url (Notifarr and Discord Supported)"
    -C    --channel <channel ID>       : Channel ID for discord noticiations (used with Notifiarr)"
    -b    --bar-color <hex>            : Discord bar color"
    -n    --bot-name <name>            : Discord bot name ("
    -r    --dry-run                    : Run script without backing up any fils (for testing)"
    -x    --config-file                : Set config file location, with config file if command arguments are used they will take precedence"
    -h    --help                       : Display this help and exit"
```

### This script performs the following actions:
* This is a bash script for creating Plex Media Server backups 
* The backups are saved to a specified destination directory
* Has options for: 
  * Forcing a full backup every X number of days
  * Forcing a full backup every run
  * Determining how many days to keep "essential" backups
  * Determine how many days to keep "full" backup
  * Wheter or not to compress your backups using 7zip
  * If running on unRAID determine if you'd like to use their built in notificaiton system
  * Suppress script output (Useful if running on on a schedule)
  * Webhook support to send notifications to Discord either using Discord's webhook or Notifiarr's api
  * If using Notifiarr you can select what channel to post messages
  * Determine bar color of your Discord notification
  * If using Discord's webhook you can select the bot's name
  * Use a dry run to test things out without really backing anything up
  * Set location for your config file
* Includes error handling for invalid configurations
* Help function to display usage instructions
* Uses command line tool 7Zip for compression, and it checks if it's installed before running the script