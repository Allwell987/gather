#!/bin/sh

# Install Teleport plugin for OBS Studio
set -e  # Exit on error

PLUGIN_DIR="$HOME/Library/Application Support/obs-studio/plugins"
PLUGIN_NAME="obs-teleport.plugin"

echo "Installing Teleport into $PLUGIN_DIR"

# Create plugin directory if it doesn't exist
mkdir -p "$PLUGIN_DIR"

# Remove existing plugin if present
if [ -d "$PLUGIN_DIR/$PLUGIN_NAME" ]; then
    echo "Removing existing $PLUGIN_NAME..."
    rm -rf "$PLUGIN_DIR/$PLUGIN_NAME"
fi

# Copy new plugin
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp -r "$SCRIPT_DIR/$PLUGIN_NAME" "$PLUGIN_DIR/$PLUGIN_NAME"

echo "Installation complete!"
