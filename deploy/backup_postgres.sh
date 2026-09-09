#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# RAVISN Omnichannel Platform — PostgreSQL + pgvector Automated Backup
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ravisn}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ravisn_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-ravisn_user}"
DB_NAME="${DB_DATABASE:-ravisn_db}"
PGPASSWORD="${DB_PASSWORD:-ravisn_secret_password}"

export PGPASSWORD

echo "======================================================================"
echo ">> [BACKUP] Starting PostgreSQL & pgvector backup for: ${DB_NAME}"
echo "   Target file: ${BACKUP_FILE}"
echo "======================================================================"

mkdir -p "${BACKUP_DIR}"

# Run pg_dump with custom compression including all vector embeddings and HNSW indexes
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --clean --if-exists --no-owner --no-privileges \
    | gzip -9 > "${BACKUP_FILE}"

echo ">> Backup successfully written (${BACKUP_FILE}, $(du -h "${BACKUP_FILE}" | cut -f1))"

# Prune backups older than retention days
echo ">> Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "ravisn_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo ">> [BACKUP COMPLETE] Backup routine finished successfully."
