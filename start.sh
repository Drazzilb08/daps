#!/bin/bash

PUID=${PUID:-99}
PGID=${PGID:-100}
UMASK=${UMASK:-002}

export RCLONE_CONFIG="${CONFIG_DIR}/rclone/rclone.conf"

# Read version number from VERSION file from current dir
# current dir
VERSION=$(cat "$(dirname "$0")/VERSION")

echo "
---------------------------------------------------------
     _____          _____   _____ 
    |  __ \   /\   |  __ \ / ____|
    | |  | | /  \  | |__) | (___  
    | |  | |/ /\ \ |  ___/ \___ \ 
    | |__| / ____ \| |     ____) |
    |_____/_/    \_\_|    |_____/ 
     (Drazzilb's Arr PMM Scripts)
                               
        PUID:           ${PUID}
        PGID:           ${PGID}
        UMASK:          ${UMASK}
        BRANCH:         ${BRANCH}
        VERSION:        ${VERSION}
        CONFIG_DIR:     ${CONFIG_DIR}
        RCLONE_CONFIG:  ${RCLONE_CONFIG}
        APPDATA Path    ${APPDATA_PATH}
        LOG_DIR:        ${LOG_DIR}
---------------------------------------------------------
"

# Set umask
umask "$UMASK"

groupmod -o -g "$PGID" dockeruser
usermod -o -u "$PUID" dockeruser


# Download latest config files if they don't exist or are different
file="config.sample.yml"
local_file="$CONFIG_DIR/$file"
if [ ! -f "$local_file" ] || [ "$(curl -s "https://raw.githubusercontent.com/Drazzilb08/daps/${BRANCH}/config/$file" | diff -q - "$local_file")" ]; then
    echo "Downloading latest $file"
    curl -s "https://raw.githubusercontent.com/Drazzilb08/daps/${BRANCH}/config/$file" -o "$local_file"
else
    echo "File $file is up to date"
fi


echo "Starting daps as $(whoami) running daps with UID: $PUID and GID: $PGID"

chown -R ${PUID}:${PGID} /${CONFIG_DIR} /app > /dev/null 2>&1
chmod -R 777 /${CONFIG_DIR} > /dev/null 2>&1

# Run main.py as the dockeruser
exec su -s /bin/bash -c "python3 /app/main.py" dockeruser