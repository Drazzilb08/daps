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

umask "${UMASK}"
exec python3 main.py