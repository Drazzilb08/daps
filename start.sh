#!/bin/bash

set -euo pipefail

PUID=${PUID:-99}
PGID=${PGID:-100}
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

groupmod -o -g "$PGID" dockeruser
usermod -o -u "$PUID" dockeruser

echo "Starting daps as $(whoami) with UID: $PUID and GID: $PGID"

chown -R "${PUID}:${PGID}" "${CONFIG_DIR}" /app
chmod -R 777 "${CONFIG_DIR}"
[ -f "${CONFIG_DIR}/config.yml" ] && chmod 660 "${CONFIG_DIR}/config.yml"

exec su -s /bin/bash -c "python3 main.py" dockeruser