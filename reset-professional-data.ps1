param(
    [switch]$Force,
    [switch]$SkipAdminBootstrap
)

$ErrorActionPreference = 'Stop'

if (-not $Force) {
    Write-Host "This script will permanently delete ALL data from auth, catalog, order, and event databases." -ForegroundColor Yellow
    $confirmation = Read-Host "Type YES to continue"
    if ($confirmation -ne 'YES') {
        Write-Host "Aborted." -ForegroundColor Red
        exit 1
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$services = @(
    'backend/auth-service',
    'backend/catalog-service',
    'backend/order-service',
    'backend/event-service'
)

Write-Host "Resetting service databases (no seed data)..." -ForegroundColor Cyan
foreach ($service in $services) {
    $servicePath = Join-Path $root $service
    Write-Host "-> $service" -ForegroundColor Yellow

    Push-Location $servicePath
    try {
        npx prisma db push --force-reset --skip-generate
        if ($LASTEXITCODE -ne 0) {
            throw "Prisma reset failed for $service"
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "Regenerating Prisma clients..." -ForegroundColor Cyan
Push-Location $root
try {
    npm run prisma:generate:all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Prisma generation failed (often caused by running services locking query engine files)." -ForegroundColor Yellow
        Write-Host "Stop running Node services and execute 'npm run prisma:generate:all' manually if needed." -ForegroundColor Yellow
    }
}
finally {
    Pop-Location
}

if (-not $SkipAdminBootstrap) {
    Write-Host "Bootstrapping verified admin account..." -ForegroundColor Cyan
    Push-Location (Join-Path $root 'backend/auth-service')
    try {
        npm run bootstrap:admin
        if ($LASTEXITCODE -ne 0) {
            throw 'Admin bootstrap failed.'
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "Completed: databases reset, seed data removed, admin account provisioned." -ForegroundColor Green
