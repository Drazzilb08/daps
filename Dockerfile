# -------------------------
# Stage 1: Builder
# -------------------------
FROM python:3.11-slim as builder

# Install build dependencies (including Node.js and build tools)
RUN set -eux; \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc wget curl unzip p7zip-full tzdata jq git build-essential nodejs npm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Install additional binaries/tools (rclone, jdupes)
RUN set -eux; \
    curl https://rclone.org/install.sh | bash && \
    git clone https://codeberg.org/jbruchon/libjodycode.git /tmp/libjodycode && \
    make -C /tmp/libjodycode && make -C /tmp/libjodycode install && \
    ldconfig && \
    git clone https://codeberg.org/jbruchon/jdupes.git /tmp/jdupes && \
    make -C /tmp/jdupes && make -C /tmp/jdupes install && \
    ln -s /usr/local/bin/jdupes /usr/bin/jdupes && \
    rm -rf /tmp/libjodycode /tmp/jdupes

# Copy full app source (including frontend)
COPY . .

# Build frontend assets
RUN cd ui && npm install && npm run build

# -------------------------
# Stage 2: Final runtime image
# -------------------------
FROM python:3.11-slim

WORKDIR /app

# Copy only Python runtime and site-packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy built frontend assets
COPY --from=builder /app/ui/dist ./ui/dist

# Copy app source files excluding node_modules etc (already filtered by .dockerignore)
COPY --from=builder /app .

# Copy frontend build output into templates folder as your original Dockerfile expects
RUN mkdir -p templates && \
    cp ui/dist/index.html templates/index.html && \
    rm -rf templates/assets templates/icons templates/img templates/posters && \
    cp -r ui/dist/assets templates/assets && \
    if [ -d ui/dist/icons ]; then cp -r ui/dist/icons templates/icons; fi && \
    if [ -d ui/dist/img ]; then cp -r ui/dist/img templates/img; fi && \
    if [ -d ui/dist/posters ]; then cp -r ui/dist/posters templates/posters; fi

# Create user/group as before
RUN groupadd -g 99 dockeruser && \
    useradd -u 100 -g 99 dockeruser && \
    chown -R dockeruser:dockeruser /app
RUN chown -R 100:99 /app

USER dockeruser

EXPOSE 8000

VOLUME /config

# Metadata and labels
LABEL maintainer="Drazzilb" \
      description="daps" \
      org.opencontainers.image.source="https://github.com/Drazzilb08/daps" \
      org.opencontainers.image.authors="Drazzilb" \
      org.opencontainers.image.title="daps"

# Branch and build number arguments
ARG BRANCH="master"
ARG BUILD_NUMBER=""
ENV BRANCH=${BRANCH}
ENV BUILD_NUMBER=${BUILD_NUMBER}
ENV CONFIG_DIR=/config
ENV APPDATA_PATH=/appdata
ENV LOG_DIR=/config/logs
ENV TZ=America/Los_Angeles
ENV PORT=8000
ENV HOST=0.0.0.0
ENV DOCKER_ENV=true

CMD ["bash", "start.sh"]