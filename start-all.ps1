# Script PowerShell pour démarrer toute la stack TraiteurPro
# Usage: .\start-all.ps1

Write-Host "🚀 Démarrage de app ..." -ForegroundColor Cyan

function Start-NodeService {
    param (
        [string]$ServiceName,
        [string]$ServicePath,
        [string]$Port,
        [string]$Command = "npm run dev"
    )

    Write-Host "  ▶ $ServiceName (port $Port)" -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ServicePath'; $Command"
}

function Start-PythonService {
    param (
        [string]$ServiceName,
        [string]$ServicePath,
        [string]$Port
    )

    Write-Host "  ▶ $ServiceName (port $Port)" -ForegroundColor Yellow
    $venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ServicePath'; & '$venvPython' -m uvicorn main:app --reload --port $Port"
    }
    else {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ServicePath'; python -m uvicorn main:app --reload --port $Port"
    }
}

$BasePath = $PSScriptRoot

# Backend services
Start-NodeService "API Gateway" "$BasePath\backend\api-gateway" "3000"
Start-Sleep -Seconds 1
Start-NodeService "Auth Service" "$BasePath\backend\auth-service" "3001"
Start-Sleep -Seconds 1
Start-NodeService "Catalog Service" "$BasePath\backend\catalog-service" "3002"
Start-Sleep -Seconds 1
Start-NodeService "Order Service" "$BasePath\backend\order-service" "3003"
Start-Sleep -Seconds 1
Start-NodeService "Event Service" "$BasePath\backend\event-service" "3004"
Start-Sleep -Seconds 1

# AI service
Start-PythonService "AI Service" "$BasePath\backend\ai-service" "8000"
Start-Sleep -Seconds 1

# Frontend
Start-NodeService "Frontend" "$BasePath\frontend" "5174"

Write-Host ""
Write-Host "✅ Tous les services sont en cours de démarrage." -ForegroundColor Green
Write-Host ""
Write-Host "📡 Endpoints principaux:" -ForegroundColor Cyan
Write-Host "  - Frontend:      http://localhost:5174" -ForegroundColor White
Write-Host "  - API Gateway:   http://localhost:3000" -ForegroundColor White
Write-Host "  - AI Service:    http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Utilise uniquement la Gateway (3000) côté frontend/API." -ForegroundColor Yellow
