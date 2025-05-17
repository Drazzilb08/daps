# Single-stage build for installing Python dependencies and required packages
FROM python:3.11-slim 

# Copy requirements.txt and install Python dependencies
COPY requirements.txt .

# Install required packages and Python dependencies
RUN set -eux; \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc wget curl unzip p7zip-full tzdata jq git build-essential && \
    pip3 install --no-cache-dir -r requirements.txt && \
    curl https://rclone.org/install.sh | bash && \
    git clone https://codeberg.org/jbruchon/libjodycode.git /tmp/libjodycode && \
    make -C /tmp/libjodycode && make -C /tmp/libjodycode install && \
    ldconfig && \
    git clone https://codeberg.org/jbruchon/jdupes.git /tmp/jdupes && \
    make -C /tmp/jdupes && make -C /tmp/jdupes install && \
    ln -s /usr/local/bin/jdupes /usr/bin/jdupes && \
    rm -rf /tmp/libjodycode /tmp/jdupes

# Clean up
RUN set -eux; \
    apt-get remove -y --purge gcc build-essential && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install gosu for safe privilege dropping
RUN set -eux; \
    dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')"; \
    wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/1.14/gosu-${dpkgArch}"; \
    chmod +x /usr/local/bin/gosu; \
    gosu nobody true

# Metadata and labels
LABEL maintainer="Drazzilb" \
      description="daps" \
      org.opencontainers.image.source="https://github.com/Drazzilb08/daps" \
      org.opencontainers.image.authors="Drazzilb" \
      org.opencontainers.image.title="daps"

# Branch and build number arguments
ARG BRANCH="master"
ARG BUILD_NUMBER=""
# Pass the build-time BRANCH arg into a runtime environment variable
ENV BRANCH=${BRANCH}
ENV BUILD_NUMBER=${BUILD_NUMBER}
ARG CONFIG_DIR=/config

# Set script environment variables
ENV CONFIG_DIR=/config
ENV APPDATA_PATH=/appdata
ENV LOG_DIR=/config/logs
ENV TZ=America/Los_Angeles
ENV PORT=8000
ENV HOST=0.0.0.0
ENV DOCKER_ENV=true

# Expose the application port
EXPOSE ${PORT}

VOLUME /config

ARG PUID=1000
ARG PGID=1000

RUN groupadd   -g "${PGID}" dockeruser \
 && useradd    -u "${PUID}" -g "${PGID}" -m dockeruser \
 && mkdir -p /config /app \
 && chown -R dockeruser:dockeruser /config /app

ENV PUID=${PUID} 
ENV PGID=${PGID}

COPY . .

# Copy entrypoint helper
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

USER dockeruser

WORKDIR /app

# Entrypoint script
CMD ["bash", "start.sh"]
