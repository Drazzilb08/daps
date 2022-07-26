#!/bin/bash

#               _    _ _        _      _     _            
#              | |  | | |      | |    (_)   | |           
#   _ __   ___ | |__| | |      | |     _ ___| |_ ___ _ __ 
#  | '_ \ / _ \|  __  | |      | |    | / __| __/ _ \ '__|
#  | | | | (_) | |  | | |____  | |____| \__ \ ||  __/ |   
#  |_| |_|\___/|_|  |_|______| |______|_|___/\__\___|_|   

#------------- DEFINE VARIABLES -------------#
# Purpose:
# The purpose of this script is to monitor your media directory for media that isn't hardlinked
# I take great pride in seeding my entire media directory as best as I can. I wrote this to notify me if something
# has been removed from a tracker and thus removed from my client and has left something w/in my media dir
# without a hardlink. If the tracker thought what was there was worth deleting, then I think that it doesn't deserve
# a place w/in my media directory. I then download another version to ensure I'm seeding the best as I can for 100% of my library
# Please not that for this to work as well as it is intended to work. It requires your files to be named in accordance to TRaSH's guides. https://trash-guides.info
# However this will still work without the discord output with any naming scheme if you use the log_file option

source=''                               # Where your media top directory is located. Eg: '/mnt/user/data/media/'
log_file=''                             # Place to put your log file (not required).
                                            # This can be useful if you have a large list of items that aren't linked and not all show up on Discord.
include=(                               # List directories to include in search no slashes
    "movies"
    "4k movies"
    "tv shows"
    "4k tv shows"
    )

#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required
use_discord=yes                         # Use discord for notifications
webhook=''                              # Discord webhook
bot_name='Notification Bot'             # Name your bot
bar_color='16776960'                    # The bar color for discord notifications, must be decimal

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
# Improper configuration handling
if [ ! -d "$source" ]; then
	echo "ERROR: Your source directory does not exist, please check your configuration"
	exit
fi
if [ -z "$source" ]; then
    echo "ERROR: Your source directory is not set , please check your configuration"
	exit
fi
if [ -n "${log_file}" ] && [ ! -d "$log_file" ]; then 
    echo "ERROR: log_file set but does not exist, please check your configuration"
    exit
fi
if [ "$use_discord" == "yes" ] && [ -z "$webhook" ]; then
    echo "ERROR: You're attempting to use the Discord integration but did not enter the webhook url."
    exit
fi
if [ -z "${log_file}" ];then # If source is NULL 
    echo "log_file not set Using only tmp directory, tmp file will be removed after run."
    touch "/tmp/nohl.tmp" 
else
    echo "log_file set to ${log_file} a log file of this run will be located there."
    if [ -f "$log_file/nohl.log" ]; then 
        rm "${log_file}/nohl.log" # Remove previous run's tmp file
    fi                                                
    touch "/tmp/nohl.tmp" "${log_file}/nohl.tmp"
    echo "Below is a list of all files from your $source directory that do not have hardlinks" | tee -a "${log_file}/nohl.tmp" >/dev/null
fi
source="${source%/}"
log_file="${log_file%/}"
get_ts=$(date -u -Iseconds)
# Begin search loop
echo "Searching, please wait..."
for ((i = 0; i < ${#include[@]}; i++)); do
    echo "Searching ${include[$i]}..." | tee -a "${log_file}/nohl.tmp"
    if [ -z "$log_file" ];then
        find "${source}/${include[$i]}" -type f -not -path "*/Scenes/*" -not -path "*/Behind The Scenes/*" -not -path "*/Trailers/*" -not -path "*/Shorts/*" -not -path "*/Featurettes/*" -not -path "*/Other/*" \( -iname \*.mp4 -o -iname \*.mkv ! -iname "*gag*" ! -iname "*blooper*" ! -iname "*Outtake*" \) -links 1 -printf "%f\n" | awk -F"[" '{print $1}' | sed $'s/[^[:print:]\t]//g' | tee -a /tmp/nohl.tmp
    else
        find "${source}/${include[$i]}" -type f -not -path "*/Scenes/*" -not -path "*/Behind The Scenes/*" -not -path "*/Trailers/*" -not -path "*/Shorts/*" -not -path "*/Featurettes/*" -not -path "*/Other/*" \( -iname \*.mp4 -o -iname \*.mkv ! -iname "*gag*" ! -iname "*blooper*" ! -iname "*Outtake*" \) -links 1 -print | tee -a "$log_file"/nohl.tmp >/dev/null
        find "${source}/${include[$i]}" -type f -not -path "*/Scenes/*" -not -path "*/Behind The Scenes/*" -not -path "*/Trailers/*" -not -path "*/Shorts/*" -not -path "*/Featurettes/*" -not -path "*/Other/*" \( -iname \*.mp4 -o -iname \*.mkv ! -iname "*gag*" ! -iname "*blooper*" ! -iname "*Outtake*" \) -links 1 -printf "%f\n" | awk -F"[" '{print $1}' | sed $'s/[^[:print:]\t]//g' | tee -a /tmp/nohl.tmp
    fi
done
echo -e "\nSearch complete. $(sed '/^\s*$/d' /tmp/nohl.tmp | wc -l) items not hardlinked\n"
sed 's/[0-9] - [A-Za-z].*//g'
# Send information to Discord
if [ "$use_discord" == "yes" ]; then
    if [ "$(sed '/^\s*$/d' /tmp/nohl.tmp | wc -l)" -ge 1 ]; then 
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Media files not hardlinked","description": "'"**List of media files that are not hardlinked:**\n\`\`\`$(sed -e '/^\s*$/d' -e $'s/- [[:alpha:]][[:alpha:]].*//g' -e $'s/- [[:digit:]][[:digit:]][[:digit:]].*//g' /tmp/nohl.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev)\`\`\`"'","fields": [{"name": "Number of issues:","value": "'"$(sed -e'/^\s*$/d' /tmp/nohl.tmp | wc -l)"'"}],"footer": {"text": "Powered by: Drazzilb | Never trust atoms; they make up everything.","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
        echo -e "Discord notification sent"
    else
        curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'"${bot_name}"'","embeds": [{"title": "Media files not hardlinked","description": "'"List of media files that are not hardlinked:\n\nNo results found...\n Great job everything is hardlinked and seeding"'","fields": [{"name": "Number of issues:","value": "'"$(sed '/^\s*$/d' /tmp/nohl.tmp | wc -l)"'"}],"footer": {"text": "Powered by: Drazzilb | Two fish are in a tank. One says, How do you drive this thing?","icon_url": "https://i.imgur.com/r69iYhr.png"},"color": "'"${bar_color}"'","timestamp": "'"${get_ts}"'"}]}' "$webhook"
        echo -e "No results found...\n Great job everything is hardlinked and seeding"
    fi
fi
echo "Removing tmp files"
rm "/tmp/nohl.tmp"
echo -e "\nAll done!\n"
exit
#
# v 1.1.4
