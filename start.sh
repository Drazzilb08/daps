#!/bin/bash

PUID=${PUID:-100}
PGID=${PGID:-99}
UMASK=${UMASK:-002}

export RCLONE_CONFIG="${CONFIG_DIR}/rclone/rclone.conf"

log_dir="${CONFIG_DIR}/logs"

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
        LOG_DIR:        ${log_dir}
---------------------------------------------------------
"

# Set umask
umask "$UMASK"

# Copy /app/config files to CONFIG_DIR unless CONFIG_DIR == /app/config
if [ "$CONFIG_DIR" != "/app/config" ]; then
    # For each item in /app/config, copy it to the CONFIG_DIR if it doesn't exist
    for file in /app/config/*; do
        if [ ! -f "$CONFIG_DIR/$(basename "$file")" ]; then
            cp "$file" "$CONFIG_DIR/$(basename "$file")"
        fi
    done
elif [ "$CONFIG_DIR" == "/app/config" ]; then
    # If ! -f config.sample.yml, download it
    if [ ! -f "${CONFIG_DIR}/config.sample.yml" ]; then
        curl -s "https://raw.githubusercontent.com/Drazzilb08/userScripts/${BRANCH}/config/config.sample.yml" -o "${CONFIG_DIR}/config.sample.yml"
    fi
    # If ! -f backup-plex-example.conf, download it
    if [ ! -f "${CONFIG_DIR}/backup-plex-example.conf" ]; then
        curl -s "https://raw.githubusercontent.com/Drazzilb08/userScripts/${BRANCH}/config/backup-plex-example.conf" -o "${CONFIG_DIR}/backup-plex-example.conf"
    fi
    # If ! -f backup-appdata-example.yml, download it
    if [ ! -f "${CONFIG_DIR}/backup-appdata-example.yml" ]; then
        curl -s "https://raw.githubusercontent.com/Drazzilb08/userScripts/${BRANCH}/config/backup-appdata-example.yml" -o "${CONFIG_DIR}/backup-appdata-example.yml"
    fi
    
fi
echo "Starting userScripts as $(whoami)"

# Start main.py
python3 /app/main.py
