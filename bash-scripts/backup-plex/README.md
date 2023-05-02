## plex-backup:

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

## FAQ:
### Why don't you just backup Plex with the Appdata script?
Short answer: no reason.<br>
Long answer: Plex being the way it is has a lot of information that you might not deem necessary to backup but sometimes it would be nice to have. If you used the appdata backup script on a very large Plex instance (such as mines). You'd find your self with script that would take quite some time to finish. This is why I made a seperate Plex backup that could allow for a more refined approach to backing up Plex. <br>
The difference is this script allows for the seperation of an "Essential" back and a "Full" backup. 

### What's the difference between an Essential and Full backup?
* Essential: <br>
  * According to Plex the main data that should be backed up are the user databases and the preferences file.
  * https://support.plex.tv/articles/201539237-backing-up-plex-media-server-data/
  * I take it a step further and also backup the Plug-ins preferences. These files contain the settings for your plugins such as the Plex media scrapers, as well as any user installed plugins (WebTools, Trakt, etc).
  * User installed Plugins are NOT backed up, though. Any plugins would need to be reinstalled on a new instance of Plex but your configuration settings would be saved.
  * This script is based upon [rcodehub's](https://github.com/rcodehub/unraid-plex-script) script and this portion is taken from his page as the information is the same
* Full: 
  * Everything except for:
    * Cache directory
    * Codecs directory

### In the CLI I get Noticiations such as this:  file changed as we read it
* This means simply the file was being written to at the time of backing up. It is always best practice to have Plex turned off prior to running the script. 
* Please note that this is a limitation of tar and that if you do run against this, that the archive may not be 100% complete. 