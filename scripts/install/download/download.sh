#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CONFIG_FILE="$REPO_ROOT/install-config.env"

echo "[info] Repo root: $REPO_ROOT"
echo "[info] Config: $CONFIG_FILE"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[error] Config file not found: $CONFIG_FILE"
  echo "Create it with lines like:"
  echo "  RELEASE_TAG=1.0.0"
  echo "  DEST_DIR=/path/to/Obsidian/.obsidian/plugins/daily-notes-sorter"
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

RELEASE_DIR="$REPO_ROOT/build/release/$RELEASE_TAG"
mkdir -p "$RELEASE_DIR"

ASSET_NAME="daily-notes-sorter-${RELEASE_TAG}.zip"
RELEASE_PAGE_URL="https://github.com/Reifat/daily-notes-sorter/releases/tag/${RELEASE_TAG}"
DOWNLOAD_URL="https://github.com/Reifat/daily-notes-sorter/releases/download/${RELEASE_TAG}/${ASSET_NAME}"
ZIP_PATH="$RELEASE_DIR/$ASSET_NAME"
EXTRACT_DIR="$RELEASE_DIR/extracted"

echo "[info] Release page: $RELEASE_PAGE_URL"
echo "[info] Downloading asset: $ASSET_NAME"
echo "[info] From: $DOWNLOAD_URL"
echo "[info] To: $ZIP_PATH"

# If already extracted and not empty, reuse cache
if [[ -d "$EXTRACT_DIR" ]] && [[ -n "$(ls -A "$EXTRACT_DIR" 2>/dev/null || true)" ]]; then
  echo "[info] Found existing extracted directory. Skipping download and extraction."
  echo "[success] Using cached extraction at: $EXTRACT_DIR"
  exit 0
fi

# If zip already exists and has non-zero size, skip download
if [[ ! -s "$ZIP_PATH" ]]; then
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 5 --retry-delay 2 -o "$ZIP_PATH" "$DOWNLOAD_URL"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$ZIP_PATH" "$DOWNLOAD_URL"
  else
    echo "[error] Neither curl nor wget is available to download files"
    exit 1
  fi
  if [[ ! -s "$ZIP_PATH" ]]; then
    echo "[error] Download failed or empty file: $ZIP_PATH"
    exit 1
  fi
else
  echo "[info] Found existing zip. Skipping download."
fi

rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"

echo "[info] Extracting archive..."
if command -v unzip >/dev/null 2>&1; then
  unzip -o -q "$ZIP_PATH" -d "$EXTRACT_DIR"
elif command -v ditto >/dev/null 2>&1; then
  ditto -x -k "$ZIP_PATH" "$EXTRACT_DIR"
else
  echo "[error] Neither unzip nor ditto is available to extract zip files"
  exit 1
fi

echo "[success] Downloaded and extracted to: $EXTRACT_DIR"


