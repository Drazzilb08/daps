#!/bin/bash

PUID=${PUID:-100}
PGID=${PGID:-99}
UMASK=${UMASK:-002}
START_DEBUG=${START_DEBUG:-false}

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

groupmod -o -g "$PGID" dockeruser
usermod -o -u "$PUID" dockeruser

# Copy /app/config files to CONFIG_DIR unless CONFIG_DIR == /app/config
if [ "$CONFIG_DIR" != "/app/config" ]; then
    # Use diff and conditional copy for files in /app/config
    for file in /app/config/*; do
        local_file="$CONFIG_DIR/$(basename "$file")"
        if [ ! -f "$local_file" ] || [ "$(diff -q "$file" "$local_file")" ]; then
            echo "Copying $(basename "$file")"
            cp "$file" "$local_file"
        else
            echo "File $(basename "$file") is up to date"
        fi
    done
elif [ "$CONFIG_DIR" == "/app/config" ]; then
    # Download config files only if they differ
    for file in config.sample.yml backup-plex-example.conf backup-appdata-example.yml; do
        local_file="$CONFIG_DIR/$file"
        if [ ! -f "$local_file" ] || [ "$(curl -s "https://raw.githubusercontent.com/Drazzilb08/userScripts/${BRANCH}/config/$file" | diff -q - "$local_file")" ]; then
            echo "Downloading latest $file"
            curl -s "https://raw.githubusercontent.com/Drazzilb08/userScripts/${BRANCH}/config/$file" -o "$local_file"
        else
            echo "File $file is up to date"
        fi
    done
fi


echo "Starting userScripts as $(whoami) running userscripts with UID: $PUID and GID: $PGID"

# Set permissions
if [ "$START_DEBUG" = "true" ]; then
    if ! chown -R ${PUID}:${PGID} /${CONFIG_DIR} /data /app /${log_dir}; then
        echo "Failed to change ownership."
        echo "DEBUG: ${PUID}:${PGID} /${CONFIG_DIR}"
        ls -la /${CONFIG_DIR} 
        echo "DEBUG: ${PUID}:${PGID} /data"
        ls -la /data
        echo "DEBUG: ${PUID}:${PGID} /app"
        ls -la /app
        echo "DEBUG: ${PUID}:${PGID} /${log_dir}"
        ls -la /${log_dir}
    fi
else
    chown -R ${PUID}:${PGID} /${CONFIG_DIR} /data /app > /dev/null 2>&1
fi

# Run main.py as the dockeruser
exec su -s /bin/bash -c "python3 /app/main.py" dockeruser