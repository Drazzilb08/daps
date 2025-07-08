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

WORKDIR /app

COPY . .

# Create a new user called dockeruser with the specified PUID and PGID
RUN groupadd -g 99 dockeruser; \
    useradd -u 100 -g 99 dockeruser; \
    chown -R dockeruser:dockeruser /app; 

# Entrypoint script
CMD ["bash", "start.sh"]
