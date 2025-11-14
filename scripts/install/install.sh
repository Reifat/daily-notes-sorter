#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$REPO_ROOT/install-config.env"
MODE="${1-}"
SRC_ROOT="$REPO_ROOT/build"
SOURCE_DIR=""

# If called without parameters: run download script, then use extracted dir as source
if [[ -z "${MODE}" ]]; then
  TARGET="$REPO_ROOT/scripts/install/download/download.sh"
  if [[ ! -x "$TARGET" ]]; then
    echo "[error] Download script not found or not executable: $TARGET"
    exit 1
  fi
  # Read RELEASE_TAG from config to compute extraction dir
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "[error] Config file not found: $CONFIG_FILE"
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
  if [[ -z "${RELEASE_TAG:-}" ]]; then
    echo "[error] RELEASE_TAG is not set in $CONFIG_FILE"
    exit 1
  fi
  EXTRACT_DIR="$SRC_ROOT/release/$RELEASE_TAG/extracted"
  bash "$TARGET"
  if [[ ! -d "$EXTRACT_DIR" ]]; then
    echo "[error] Extracted directory not found: $EXTRACT_DIR"
    exit 1
  fi
  SOURCE_DIR="$EXTRACT_DIR"
  MODE="Downloaded"
else
  # Legacy behavior when a parameter is provided: copy from build/{dev,release}
  MODE="${MODE:-Release}"
  if [[ "${MODE,,}" == "dev" ]]; then
    SOURCE_DIR="$SRC_ROOT/dev"
  else
    SOURCE_DIR="$SRC_ROOT/release"
  fi
fi

echo "[info] Repo root: $REPO_ROOT"
echo "[info] Config: $CONFIG_FILE"
echo "[info] Mode: $MODE"
echo "[info] Source dir: $SOURCE_DIR"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[error] Config file not found: $CONFIG_FILE"
  echo "Create it with a line like: DEST_DIR=/path/to/target"
  exit 1
fi

# Load .env-like config (supports comments starting with #)
set -a
# shellcheck disable=SC1090
source "$CONFIG_FILE"
set +a

if [[ -z "${DEST_DIR:-}" ]]; then
  echo "[error] DEST_DIR is not set in $CONFIG_FILE"
  exit 1
fi

# Expand leading ~ if present
if [[ "$DEST_DIR" == "~"* ]]; then
  DEST_DIR="${HOME}${DEST_DIR:1}"
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "[error] Source directory not found: $SOURCE_DIR"
  exit 1
fi

echo "[info] Destination: $DEST_DIR"
mkdir -p "$DEST_DIR"

echo "[info] Copying files from source to destination..."
# Copy contents of SOURCE_DIR into DEST_DIR, preserving structure
if command -v rsync >/dev/null 2>&1; then
  rsync -a "$SOURCE_DIR"/ "$DEST_DIR"/
else
  # Fallback to cp -R (portable enough for macOS and Linux)
  cp -R "$SOURCE_DIR"/. "$DEST_DIR"/
fi

echo "[success] Files copied to $DEST_DIR"


