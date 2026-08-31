#!/usr/bin/env bash
# ==============================================================================
# RAVISN Platform: Monorepo Consolidation Script (Git Subtree Merge)
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
mkdir -p "$TARGET_DIR/apps/whatsapp-qr-service"
mkdir -p "$TARGET_DIR/apps/frontend"
mkdir -p "$TARGET_DIR/nginx"
mkdir -p "$TARGET_DIR/scripts"

# Copy Laravel Core
echo "[1/4] Copying Laravel Core files to apps/core..."
rsync -av --exclude="inbound-main" --exclude="node_modules" --exclude="vendor" --exclude=".git" --exclude=".venv" --exclude="__pycache__" "$LARAVEL_SRC/" "$TARGET_DIR/apps/core/"

# Copy FastAPI Agent
echo "[2/4] Copying FastAPI Agent files to apps/agent..."
rsync -av --exclude="whatsapp-qr-service" --exclude="frontend" --exclude="node_modules" --exclude=".venv" --exclude=".git" --exclude="__pycache__" "$FASTAPI_SRC/" "$TARGET_DIR/apps/agent/"

# Copy WhatsApp QR Service
echo "[3/4] Copying WhatsApp QR service to apps/whatsapp-qr-service..."
if [ -d "$FASTAPI_SRC/whatsapp-qr-service" ]; then
    rsync -av --exclude="node_modules" --exclude="sessions" --exclude=".git" "$FASTAPI_SRC/whatsapp-qr-service/" "$TARGET_DIR/apps/whatsapp-qr-service/"
fi

# Copy Frontend
echo "[4/4] Copying Agent Frontend to apps/frontend..."
if [ -d "$FASTAPI_SRC/frontend" ]; then
    rsync -av --exclude="node_modules" --exclude="dist" --exclude=".git" "$FASTAPI_SRC/frontend/" "$TARGET_DIR/apps/frontend/"
fi

# Initialize Git
cd "$TARGET_DIR"
if [ ! -d ".git" ]; then
    git init
    git config user.name "RAVISN Platform Engineer"
    git config user.email "engineering@ravisn.com"
fi

echo "Consolidation complete in $TARGET_DIR!"
