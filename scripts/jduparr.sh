#!/bin/bash

#     _ _____  _    _ _____        _____  _____  
#    (_)  __ \| |  | |  __ \ /\   |  __ \|  __ \ 
#     _| |  | | |  | | |__) /  \  | |__) | |__) |
#    | | |  | | |  | |  ___/ /\ \ |  _  /|  _  / 
#    | | |__| | |__| | |  / ____ \| | \ \| | \ \ 
#    | |_____/ \____/|_| /_/    \_\_|  \_\_|  \_\
#   _/ |                                         
#  |__/                                          
#

# This script is inteded to go through your media in a more methodical way and ensure things are properly linked together.
# Note: Running this script through userscripts will produce no output. The program still runs as inteded.
# Note: jdupes is required for this script to run, please install jdupes via the NerdPack from the available in the appstore
# This script was purly for schlitz giggles and can be 100% replaced with simply running the jdupes command in terminal.

downloads_dir=''        # Where you place your downloads        
media_dir=''            # Where you place your media

#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required

use_discord=yes                     # Use discord for notifications
webhook=''                          # Discord webhook
bot_name='Notification Bot'         # Name your bot
bar_color='16776960'                # The bar color for discord notifications, must be decimal

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
command -v jdupes >/dev/null 2>&1 || { 
    echo -e >&2 "jdupes is not installed.\nPlease install jdupes and rerun.\nIf on unRaid, jdupes can be found through the NerdPack which is found in the appstore"; 
    exit 1; 
}

if [ "$use_discord" == "yes" ] && [ -z "$webhook" ]; then
    echo "ERROR: You're attempting to use the Discord integration but did not enter the webhook url."
    exit
fi
if [ -e "/tmp/i.am.running.jdupes.tmp" ]; then
    echo "Another instance of the script is running. Aborting."
    echo "Please use rm /tmp/i.am.running.jdupes.tmp in your terminal to remove the locking file"
    exit
else
    touch "/tmp/i.am.running.jdupes.tmp"
fi

get_ts=$(date -u -Iseconds) # Get time stamp
start=$(date +%s) # start time of script for statistics
jdupes -r -L -A -X onlyext:mp4,mkv,avi "${downloads_dir}" "${media_dir}"
end=$(date +%s)

# Runtime
total_time=$((end - start))
seconds=$((total_time % 60))
minutes=$((total_time % 3600 / 60))
hours=$((total_time / 3600))

# Runtime output
if ((minutes == 0 && hours == 0)); then
    run_output="jDupes completed in $seconds seconds"
elif ((hours == 0)); then
    run_output="jDupes completed in $minutes minutes and $seconds seconds"
else
    run_output="jDupes completed in $hours hours $minutes minutes and $seconds seconds"
fi
echo "$run_output"
cat /tmp/jduparr.log
# Discord notification
if [ "$use_discord" == "yes" ]; then
    echo -e "Discord notification sent.\n"
    curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "jDupes","description": "'"jDupes has finished it's run."'","fields": [{"name": "Runtime:","value": "'"${run_output}"'"}],"footer": {"text": "'"Powered by: Drazzilb | I'm reading a book about anti-gravity. It's impossible to put down."'","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
else
    echo "$run_output"
fi
rm "/tmp/i.am.running.jdupes.tmp"
echo -e "\nAll Done\n"
exit
#
# v1.0.1