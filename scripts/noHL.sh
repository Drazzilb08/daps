#!/bin/bash

#               _    _ _        _      _     _
#              | |  | | |      | |    (_)   | |
#   _ __   ___ | |__| | |      | |     _ ___| |_ ___ _ __
#  | '_ \ / _ \|  __  | |      | |    | / __| __/ _ \ '__|
#  | | | | (_) | |  | | |____  | |____| \__ \ ||  __/ |
#  |_| |_|\___/|_|  |_|______| |______|_|___/\__\___|_|

#------------- DEFINE VARIABLES -------------#
# Purpose
# The purpose of this script is to monitor your media directory for media that isn't hardlinked
# I take great pride in seeding my entire media directory as best as I can. I wrote this to notify me if something
# has been removed from a tracker and thus removed from my client and has left something w/in my media dir
# without a hardlink. If the tracker thought what was there was worth deleting, then I think that it doesn't deserve
# a place w/in my media directory. I then download another version to. ensure I'm seeding the best as I can for 100% of my library

source=''        #No trailing slash/Your media directory
destination='' #No trailing slash/Where you want your tmp file to be saved
                                        #I saved this in a location just in case I want to see the full file
                                        # NOT REQUIRED

#List directories to include in search no slashes
include=(
    "movies"
    "4k movies"
    "tv shows"
    "4k tv shows"
)
#------------- DEFINE DISCORD VARIABLES -------------#
# This section is not required
# This portion requires discord.sh to be downloaded and placed somewhere in a location accessable by this script
# You can find discord.sh ----> https://github.com/ChaoticWeg/discord.sh
# Simply download or clone the repo and extract the discord.sh file to a loaction then define that location in the discordLoc variable

useDiscord=yes # Use discord for notifications
# Note, there is a limititation of 20 containers per list and list_no_stop if you're going to use discord

discordLoc=''                                                    # Full location to discord.sh
                                                                    # Eg. '/mnt/user/data/scripts/discord.sh'
webhook=''                                                       # Discord webhook
botName='Notification Bot'                                       # Name your bot
titleName='Server Notifications'                                 # Give a title name to your discord messages
barColor='FFFF00'                                                # The bar color for discord notifications, must be Hexcode
avatarUrl=''                                                     # Url for the avatar you want your bot to have

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
if [ ! -z "${destination}" ] && [ ! -d "$destination" ]; then 
    echo "ERROR: Destination set but does not exist, please check your configuration"
    exit
fi
if [ "$useDiscord" == "yes" ] && [ ! -f "$discordLoc" ] || [ -z "$discordLoc" ]; then
	echo "ERROR: You're attempting to use the Discord integration but discord.sh is not found at ${discordLoc} or not set"
	exit
fi
if [ -z "${destination}" ];then                                 #If source is NULL 
    echo "Destination not set Using only temp directory, temp file will be removed after run."
    touch "/tmp/nohl.tmp" 
else
    echo "Destination set to ${destination} a log file of this run will be located there."
    rm "${destination}/nohl.tmp"                                #Remove previous run's tmp file
    touch "/tmp/nohl.tmp" "${destination}/nohl.tmp"
    echo "Below is a list of all files from your $source directory that do not have hardlinks" | tee -a "${destination}/nohl.tmp" >/dev/null
fi
# Begin search loop
echo "Searching, please wait..."
for ((i = 0; i < ${#include[@]}; i++)); do
    echo "Searching ${include[$i]}..." | tee -a "${destination}/nohl.tmp"
    if [ -z "{$destination}" ];then
        echo "$(find "${source}/${include[$i]}" -type f -not -path "*/Scenes/*" -not -path "*/Behind The Scenes/*" -not -path "*/Trailers/*" -not -path "*/Shorts/*" -not -path "*/Featurettes/*" -not -path "*/Other/*" \( -iname \*.mp4 -o -iname \*.mkv ! -iname "*gag*" ! -iname "*blooper*" ! -iname "*Outtake*" \) -links 1 -printf "%f\n" | awk -F"[" '{print $1}')" | sed $'s/[^[:print:]\t]//g' | tee "/tmp/nohl.tmp"     
    else
        echo "$(find "${source}/${include[$i]}" -type f -not -path "*/Scenes/*" -not -path "*/Behind The Scenes/*" -not -path "*/Trailers/*" -not -path "*/Shorts/*" -not -path "*/Featurettes/*" -not -path "*/Other/*" \( -iname \*.mp4 -o -iname \*.mkv ! -iname "*gag*" ! -iname "*blooper*" ! -iname "*Outtake*" \) -links 1 -print )" | tee -a "${destination}/nohl.tmp" >/dev/null
        echo "$(find "${source}/${include[$i]}" -type f -not -path "*/Scenes/*" -not -path "*/Behind The Scenes/*" -not -path "*/Trailers/*" -not -path "*/Shorts/*" -not -path "*/Featurettes/*" -not -path "*/Other/*" \( -iname \*.mp4 -o -iname \*.mkv ! -iname "*gag*" ! -iname "*blooper*" ! -iname "*Outtake*" \) -links 1 -printf "%f\n" | awk -F"[" '{print $1}')" | sed $'s/[^[:print:]\t]//g' | tee "/tmp/nohl.tmp"      
    fi
done
found=$(wc -l < /tmp/nohl.tmp)
echo -e "\nSearch complete. $found items not hardlinked\n"
# Send information to Discord
if [ "$useDiscord" == "yes" ]; then
    if [ $(wc -l < /tmp/nohl.tmp) -ge 1 ]; then
        ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
            --title "${titleName}" \
            --avatar "$avatarUrl" \
            --field "Number of items not hardlinked:; ${found} items; false" \
            --field "List of media files that are not hardlinked.; \`\`\`$(cat /tmp/nohl.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev)\`\`\`;false" \
            --color "0x$barColor" \
            --footer "Powered by: Drazzilb" \
            --footer-icon "https://i.imgur.com/r69iYhr.png" \
            --timestamp
        echo -e "\nDiscord notification sent."
    else
        echo -e "No results found...\n Great job everything is hardlinked and seeding"
    fi
fi
echo "Removing temp files"
rm "/tmp/nohl.tmp"
echo -e "\nAll done!\n"
exit
#
# v 1.0.2