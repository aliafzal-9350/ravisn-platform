#!/usr/bin/env bash
# ==============================================================================
# RAVISN Platform: Monorepo Consolidation Script
# ==============================================================================
set -e

TARGET_DIR="${1:-/c/Users/User/Documents/ravisn-platform}"
LARAVEL_SRC="${2:-/c/Users/User/Documents/ravisn_whatsapp_agent-main}"
FASTAPI_SRC="${3:-/c/Users/User/Documents/inbound-main}"

echo "======================================================"
echo "  RAVISN PLATFORM: MONOREPO CONSOLIDATION SCRIPT      "
echo "======================================================"

mkdir -p "$TARGET_DIR/apps/core"
mkdir -p "$TARGET_DIR/apps/agent"
mkdir -p "$TARGET_DIR/deploy"
mkdir -p "$TARGET_DIR/scripts"

# Copy Laravel Core
echo "[1/3] Copying Laravel Core files to apps/core..."
rsync -av --exclude="inbound-main" --exclude="node_modules" --exclude="vendor" --exclude=".git" --exclude=".venv" --exclude="__pycache__" "$LARAVEL_SRC/" "$TARGET_DIR/apps/core/"

# Copy FastAPI Agent
echo "[2/3] Copying FastAPI Agent files to apps/agent..."
rsync -av --exclude="whatsapp-qr-service" --exclude="frontend" --exclude="node_modules" --exclude=".venv" --exclude=".git" --exclude="__pycache__" "$FASTAPI_SRC/" "$TARGET_DIR/apps/agent/"

# Initialize Git
cd "$TARGET_DIR"
if [ ! -d ".git" ]; then
    git init
    git branch -M main
    git config user.name "RAVISN Platform Engineer"
    git config user.email "engineering@ravisn.com"
fi

echo "Consolidation complete in $TARGET_DIR!"
