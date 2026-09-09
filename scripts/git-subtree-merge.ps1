<#
.SYNOPSIS
    Consolidates ravisn_whatsapp_agent-main and inbound-main into a unified ravisn-platform monorepo.
.DESCRIPTION
    Initializes git repository, sets up apps/ directory layout:
    - apps/core (Laravel CRM & WhatsApp Meta Webhook / Outbound)
    - apps/agent (FastAPI Multi-Agent AI & LangGraph Inbound)
#>

param(
    [string]$TargetDir = "C:\Users\User\Documents\ravisn-platform",
    [string]$LaravelSrc = "C:\Users\User\Documents\ravisn_whatsapp_agent-main",
    [string]$FastApiSrc = "C:\Users\User\Documents\inbound-main"
)

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  RAVISN PLATFORM: MONOREPO CONSOLIDATION SCRIPT      " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Ensure Target Directory Exists
if (-not (Test-Path $TargetDir)) {
    Write-Host "[1/4] Creating target directory: $TargetDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

# 2. Setup apps structure
$appsCore = Join-Path $TargetDir "apps\core"
$appsAgent = Join-Path $TargetDir "apps\agent"
$deployDir = Join-Path $TargetDir "deploy"
$scriptsDir = Join-Path $TargetDir "scripts"

@($appsCore, $appsAgent, $deployDir, $scriptsDir) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# 3. Copy Laravel Core to apps/core
Write-Host "[2/4] Copying Laravel Core files to apps/core..." -ForegroundColor Green
$coreExclude = @("inbound-main", "node_modules", "vendor", ".git", ".venv", "__pycache__")
Get-ChildItem -Path $LaravelSrc -Force | Where-Object { $coreExclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $appsCore -Recurse -Force
}

# 4. Copy FastAPI Agent to apps/agent
Write-Host "[3/4] Copying FastAPI Agent files to apps/agent..." -ForegroundColor Green
$agentExclude = @("whatsapp-qr-service", "frontend", "node_modules", ".venv", ".git", "__pycache__", "alembic")
Get-ChildItem -Path $FastApiSrc -Force | Where-Object { $agentExclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $appsAgent -Recurse -Force
}

# 5. Initialize Git Repository in Target
Write-Host "[4/4] Initializing and configuring Git repository in $TargetDir..." -ForegroundColor Green
Set-Location $TargetDir
if (-not (Test-Path (Join-Path $TargetDir ".git"))) {
    git init
    git branch -M main
    git config user.name "RAVISN Platform Engineer"
    git config user.email "engineering@ravisn.com"
}

Write-Host "Consolidation complete in $TargetDir!" -ForegroundColor Cyan
