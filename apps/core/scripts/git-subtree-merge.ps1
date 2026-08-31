<#
.SYNOPSIS
    Consolidates ravisn_whatsapp_agent-main and inbound-main into a unified ravisn-platform monorepo.
.DESCRIPTION
    Initializes git repository, sets up apps/ directory layout:
    - apps/core (Laravel CRM & WhatsApp Outbound)
    - apps/agent (FastAPI Multi-Agent AI & LangGraph Inbound)
    - apps/whatsapp-qr-service (Node.js Baileys QR Service)
    - apps/frontend (Inbound Agent React Frontend)
    - nginx (Unified Reverse Proxy)
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
    Write-Host "[1/6] Creating target directory: $TargetDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
} else {
    Write-Host "[1/6] Target directory already exists: $TargetDir" -ForegroundColor Yellow
}

# 2. Setup apps structure
$appsCore = Join-Path $TargetDir "apps\core"
$appsAgent = Join-Path $TargetDir "apps\agent"
$appsQr = Join-Path $TargetDir "apps\whatsapp-qr-service"
$appsFrontend = Join-Path $TargetDir "apps\frontend"
$nginxDir = Join-Path $TargetDir "nginx"
$scriptsDir = Join-Path $TargetDir "scripts"

@($appsCore, $appsAgent, $appsQr, $appsFrontend, $nginxDir, $scriptsDir) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# 3. Copy Laravel Core to apps/core (excluding nested inbound-main, node_modules, vendor, .git)
Write-Host "[2/6] Copying Laravel Core files to apps/core..." -ForegroundColor Green
$coreExclude = @("inbound-main", "node_modules", "vendor", ".git", ".venv", "__pycache__")
Get-ChildItem -Path $LaravelSrc -Force | Where-Object { $coreExclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $appsCore -Recurse -Force
}

# 4. Copy FastAPI Agent to apps/agent (excluding whatsapp-qr-service, frontend, node_modules, .venv, .git)
Write-Host "[3/6] Copying FastAPI Agent files to apps/agent..." -ForegroundColor Green
$agentExclude = @("whatsapp-qr-service", "frontend", "node_modules", ".venv", ".git", "__pycache__")
Get-ChildItem -Path $FastApiSrc -Force | Where-Object { $agentExclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $appsAgent -Recurse -Force
}

# 5. Copy whatsapp-qr-service to apps/whatsapp-qr-service
Write-Host "[4/6] Copying WhatsApp QR service to apps/whatsapp-qr-service..." -ForegroundColor Green
$qrSrc = Join-Path $FastApiSrc "whatsapp-qr-service"
if (Test-Path $qrSrc) {
    Get-ChildItem -Path $qrSrc -Force | Where-Object { @("node_modules", "sessions", ".git") -notcontains $_.Name } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $appsQr -Recurse -Force
    }
}

# 6. Copy frontend to apps/frontend
Write-Host "[5/6] Copying Standalone Agent Frontend to apps/frontend..." -ForegroundColor Green
$frontendSrc = Join-Path $FastApiSrc "frontend"
if (Test-Path $frontendSrc) {
    Get-ChildItem -Path $frontendSrc -Force | Where-Object { @("node_modules", "dist", ".git") -notcontains $_.Name } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $appsFrontend -Recurse -Force
    }
}

# 7. Initialize Git Repository in Target
Write-Host "[6/6] Initializing and configuring Git repository in $TargetDir..." -ForegroundColor Green
Set-Location $TargetDir
if (-not (Test-Path (Join-Path $TargetDir ".git"))) {
    git init
    git config user.name "RAVISN Platform Engineer"
    git config user.email "engineering@ravisn.com"
}

Write-Host "Consolidation complete!" -ForegroundColor Cyan
