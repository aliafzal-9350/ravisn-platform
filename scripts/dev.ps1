<#
.SYNOPSIS
    Windows replacement for the Makefile (PowerShell has no `make`).

.EXAMPLE
    .\scripts\dev.ps1 up          # start everything (local dev)
    .\scripts\dev.ps1 down        # stop everything
    .\scripts\dev.ps1 rebuild     # rebuild images after dependency changes, then start
    .\scripts\dev.ps1 migrate     # back up the database, then run migrations
    .\scripts\dev.ps1 backup      # back up the database only
    .\scripts\dev.ps1 status      # show every service and its health
    .\scripts\dev.ps1 logs agent-worker
    .\scripts\dev.ps1 test        # run the agent and Laravel test suites

    If PowerShell blocks scripts, run once:
    Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#>
param(
    [Parameter(Position = 0)][ValidateSet('up', 'down', 'rebuild', 'migrate', 'backup', 'status', 'logs', 'test')]
    [string]$Command = 'status',
    [Parameter(Position = 1)][string]$Service = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Compose { docker compose -f docker-compose.yml -f docker-compose.dev.yml @args }

switch ($Command) {
    'up' { Compose up -d }
    'down' { Compose down }
    'rebuild' { Compose build; Compose up -d }
    'backup' { & (Join-Path $PSScriptRoot 'backup-db.ps1') }
    'migrate' {
        # Never change the database without a fresh backup first.
        & (Join-Path $PSScriptRoot 'backup-db.ps1')
        Compose exec core php artisan migrate --force
    }
    'status' { Compose ps }
    'logs' { if ($Service) { Compose logs -f --tail 100 $Service } else { Compose logs -f --tail 50 } }
    'test' {
        Compose exec -w /app agent python -m pytest tests/ -q
        Compose exec core php artisan test --compact
    }
}
