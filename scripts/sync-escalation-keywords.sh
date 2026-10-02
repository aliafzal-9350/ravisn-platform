#!/usr/bin/env bash
# Propagates the canonical escalation keyword list to each app's own repo tree,
# since apps/core (PHP) and apps/agent (Python) are built/deployed as separate
# containers and cannot share a live filesystem path at runtime.
#
# Usage: run this from the repo root whenever shared/escalation-keywords.json changes.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

SOURCE="shared/escalation-keywords.json"
CORE_DEST="apps/core/resources/data/escalation-keywords.json"
AGENT_DEST="apps/agent/src/data/escalation-keywords.json"

mkdir -p "$(dirname "$CORE_DEST")" "$(dirname "$AGENT_DEST")"
cp "$SOURCE" "$CORE_DEST"
cp "$SOURCE" "$AGENT_DEST"

echo "Synced $SOURCE -> $CORE_DEST"
echo "Synced $SOURCE -> $AGENT_DEST"
