#!/bin/bash

set -euo pipefail

# Default UID/GID if not passed via environment
PUID=${PUID:-100}
PGID=${PGID:-99}
UMASK=${UMASK:-002}
BRANCH=${BRANCH:-master}

export RCLONE_CONFIG="${CONFIG_DIR}/rclone/rclone.conf"

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
        DOCKER:         ${DOCKER_ENV}
        VERSION:        ${VERSION}
        CONFIG_DIR:     ${CONFIG_DIR}
        RCLONE_CONFIG:  ${RCLONE_CONFIG}
        APPDATA Path:   ${APPDATA_PATH}
        LOG_DIR:        ${LOG_DIR}
---------------------------------------------------------
"

echo "Setting umask to ${UMASK}"
umask "$UMASK"

echo "Adjusting ownership of config and app directories"
chown -R "${PUID}:${PGID}" "${CONFIG_DIR}" /app || true
chmod -R 777 "${CONFIG_DIR}" || true
[ -f "${CONFIG_DIR}/config.yml" ] && chmod 660 "${CONFIG_DIR}/config.yml"

echo "Starting daps as $(whoami) with UID: $PUID and GID: $PGID"
exec python3 main.py