#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# RAVISN Omnichannel Platform — PostgreSQL + pgvector Database Restore
# Usage: ./restore_postgres.sh /path/to/backup.sql.gz
# ==============================================================================

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file '${BACKUP_FILE}' does not exist."
    exit 1
fi

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-ravisn_user}"
DB_NAME="${DB_DATABASE:-ravisn_db}"
PGPASSWORD="${DB_PASSWORD:-ravisn_secret_password}"

export PGPASSWORD

echo "======================================================================"
echo ">> [RESTORE] Restoring database '${DB_NAME}' from: ${BACKUP_FILE}"
echo "======================================================================"

# Terminate active backend connections to allow schema restore
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "postgres" -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" || true

# Restore compressed database dump
gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --single-transaction

echo "======================================================================"
echo ">> [RESTORE COMPLETE] Database restored successfully."
echo "======================================================================"
