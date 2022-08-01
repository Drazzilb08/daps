# README

This script is inteded to backup predefined appdata directories. Allowing you to either shut down a container and backup the appdata contents (useful if container locks files), backup appdata of a container without shutting it down, finally just backing up a directory within your appdata that might not be associated with a container (useful if you have appdata for something you might come back to but have removed the container)

## Requirements

- This script was written to work primarily with unRaid, however can work with any unix based system.
- For unraid it is highly recommended to have the UserScripts app to automate the process using cron

## Why should I use this script?

- This script allows you to backup your most precious data from the applications you run on your server.
- The script also allows you to compress these backups.
- This script features discord notifications to keep tabs on certain statistics of your backup.
- The script features pigz compression (pigz required to use, unRaid users will need to install via Nerd Pack).
- Script includes exclud-file that can be used to exclude certain files from being backed up. Eg. log files/certain images etc. etc.

## Config File

- See detailed notes on config file about each operation
- Only parameter that needs to be edited on the actual script is the location for your config file.

## How To Use

- Clone repo
- Two options
  - UserScripts: Copy contents of backup-appdata.sh into UserScripts, fill out `config_file` variable.
  - Command Line: From terminal `cd` to cloned repo `chmod +x backup-appdata.sh` (this makes the file executable)
- Run script

## `backup-appdata.sh` usage

### One Time

- Can be run from UserScripts by clicking `Run Script` or `Run In Background`

- Can be ran from command line

  backup-appdata.sh

### Scheduled

UserScripts: Set schedule either custom/daily/weekly/monthly as desired. <br> \* Note: `Custom` requires crontab format examples from [crontab.guru](https://crontab.guru)

CronTab:  
 0 _/6 _ \* \* pwsh /path/to/repo/clone/location/userScripts/backup-appdata.sh
