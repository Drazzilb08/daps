#!/bin/bash

PUID=${PUID:-100}
PGID=${PGID:-99}
UMASK=${UMASK:-002}

log_path="${CONFIG_DIR}/logs"

export RCLONE_CONFIG="${CONFIG_DIR}/rclone/rclone.conf"
export LOG_DIR="${log_path}"

echo "
---------------------------------------------------------
                      _____           _       _       
                     / ____|         (_)     | |      
  _   _ ___  ___ _ _| (___   ___ _ __ _ _ __ | |_ ___ 
 | | | / __|/ _ \ '__\___ \ / __| '__| | '_ \| __/ __|
 | |_| \__ \  __/ |  ____) | (__| |  | | |_) | |_\__ \\
  \__,_|___/\___|_| |_____/ \___|_|  |_| .__/ \__|___/
                                       | |            
                                       |_|
        PUID:           ${PUID}            
        PGID:           ${PGID}
        UMASK:          ${UMASK}
        BRANCH:         ${BRANCH}
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
for file in config.sample.yml backup_appdata.example.conf; do
    local_file="$CONFIG_DIR/$file"
    if [ ! -f "$local_file" ] || [ "$(curl -s "https://raw.githubusercontent.com/Drazzilb08/userScripts/${BRANCH}/config/$file" | diff -q - "$local_file")" ]; then
        echo "Downloading latest $file"
        curl -s "https://raw.githubusercontent.com/Drazzilb08/userScripts/${BRANCH}/config/$file" -o "$local_file"
    else
        echo "File $file is up to date"
    fi
done


echo "Starting userScripts as $(whoami) running userscripts with UID: $PUID and GID: $PGID"

chown -R ${PGID}:${PUID} /${CONFIG_DIR} /app > /dev/null 2>&1
chmod -R 777 /${CONFIG_DIR} > /dev/null 2>&1

# Run main.py as the dockeruser
exec su -s /bin/bash -c "python3 /app/main.py" dockeruser