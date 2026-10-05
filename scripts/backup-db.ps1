<#
.SYNOPSIS
    Free database backup (no Supabase Pro needed).

.DESCRIPTION
    Dumps the app's tables (the "public" schema) from the database configured
    as DATABASE_URL in apps/core/.env into a compressed .sql.gz file, using a
    temporary Postgres 17 container. Run it before every migration.

    The file is written OUTSIDE the project (..\ravisn-backups by default) so it
    can never be committed to GitHub. Keep a copy somewhere safe (e.g. Google
    Drive): it contains your customers' data.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
#>
param(
    [string]$OutDir = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'ravisn-backups')
)

$ErrorActionPreference = 'Stop'

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) 'apps\core\.env'
$line = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $line) {
    throw "DATABASE_URL was not found in $envFile"
}
$url = ($line -replace '^DATABASE_URL=', '').Trim().Trim('"').Trim("'")

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$name = 'ravisn-{0}.sql.gz' -f (Get-Date -Format 'yyyyMMdd-HHmmss')

Write-Host "Backing up the database to $OutDir\$name ..."

# The URL (with its password) is passed as an environment variable, so it is
# never shown on screen or stored in the command history.
$env:PGURL = $url
try {
    docker run --rm -e PGURL -v "${OutDir}:/backup" postgres:17-alpine sh -c "pg_dump `"`$PGURL`" --schema=public --no-owner --no-privileges | gzip -9 > /backup/$name && test -s /backup/$name"
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed (exit code $LASTEXITCODE). Nothing was changed in your database."
    }
}
finally {
    Remove-Item Env:\PGURL -ErrorAction SilentlyContinue
}

$size = [math]::Round((Get-Item (Join-Path $OutDir $name)).Length / 1KB, 1)
Write-Host "Backup complete: $OutDir\$name ($size KB)"
