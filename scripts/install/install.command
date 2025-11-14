#!/usr/bin/env bash
# macOS double-clickable wrapper that delegates to the Unix installer
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SCRIPT_DIR/install.sh" "$@"



