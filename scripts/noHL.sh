#!/bin/bash

#               _    _ _        _      _     _
#              | |  | | |      | |    (_)   | |
#   _ __   ___ | |__| | |      | |     _ ___| |_ ___ _ __
#  | '_ \ / _ \|  __  | |      | |    | / __| __/ _ \ '__|
#  | | | | (_) | |  | | |____  | |____| \__ \ ||  __/ |
#  |_| |_|\___/|_|  |_|______| |______|_|___/\__\___|_|

#------------- DEFINE VARIABLES -------------#
source='/mnt/user/data/media'        #No trailing slash
destination='/mnt/user/data/scripts' #No trailing slash

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

debug=yes

#------------- DO NOT MODIFY BELOW THIS LINE -------------#
rm "${destination}/nohl.tmp" #Remove previous run's tmp file
touch "${destination}/nohl.tmp"

echo '```' >>"${destination}/nohl.tmp"
for ((i = 0; i < ${#include[@]}; i++)); do
    echo "$(find "${source}/${include[$i]}" -type f -not -path "*/Scenes/*" -not -path "*/Behind The Scenes/*" -not -path "*/Trailers/*" -not -path "*/Shorts/*" -not -path "*/Featurettes/*" -not -path "*/Other/*" \( -iname \*.mp4 -o -iname \*.mkv ! -iname "*gag*" ! -iname "*blooper*" ! -iname "*Outtake*" \) -links 1 -printf "%f\n" | awk -F"[" '{print $1}')" | sed $'s/[^[:print:]\t]//g' | tee "${destination}/nohl.tmp"
done
if [ "$useDiscord" == "yes" ]; then
    ${discordLoc} --webhook-url="$webhook" --username "${botName}" \
        --title "${titleName}" \
        --avatar "$avatarUrl" \
        --field "List of media files that are not hardlinked.; \`\`\`$(cat ${destination}/nohl.tmp | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev)\`\`\`;false" \
        --color "0x$barColor" \
        --footer "Powered by: Drazzilb" \
        --footer-icon "https://i.imgur.com/r69iYhr.png" \
        --timestamp
    echo -e "\nDiscord notification sent."
fi
exit
