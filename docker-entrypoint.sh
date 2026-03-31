#!/bin/sh
# DOMDIS entrypoint — runs as root, then drops to domdis
set -e

CONFIG_DIR="/app/config"
DEFAULTS_DIR="/app/config-defaults"

# Copy default config files if they don't exist yet (first start)
for f in settings.json pages.json; do
  if [ ! -f "$CONFIG_DIR/$f" ]; then
    echo "[domdis] First start: copying default $f"
    cp "$DEFAULTS_DIR/$f" "$CONFIG_DIR/$f"
  fi
done

# Fix ownership so the domdis user can write to the mounted volume
chown -R domdis:domdis "$CONFIG_DIR"

# Drop privileges and start the app
exec su-exec domdis node server.js
