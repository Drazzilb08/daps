#!/command/with-contenv bash
# shellcheck shell=bash

echo "
------------------------------------------------
  Starting userScripts
------------------------------------------------
"

if [[ ! -f "${CONFIG_DIR}/config.yml" ]]; then
    echo "Config file not found. Copying config.sample.yml to ${CONFIG_DIR}"
    cp /app/config/config.sample.yml "${CONFIG_DIR}"
fi
if [[ ! -f "${CONFIG_DIR}/backup-appdata.conf" ]]; then
    echo "Backup appdata config file not found. Copying backup-appdata-example.conf to ${CONFIG_DIR}"
    cp /app/config/backup-appdata-example.conf "${CONFIG_DIR}"
fi
if [[ ! -f "${CONFIG_DIR}/backup-plex.conf" ]]; then
    echo "Backup plex config file not found. Copying backup-plex-example.conf to ${CONFIG_DIR}"
    cp /app/config/backup-plex-example.conf "${CONFIG_DIR}"
fi

echo "Setting permissions for ${CONFIG_DIR} and ${DATA_DIR} to ${PUID}:${PGID}"
chown hotio:hotio -R "${CONFIG_DIR}"
chown hotio:hotio -R "${DATA_DIR}"


exec s6-setuidgid hotio python3 "${APP_DIR}/main.py"

