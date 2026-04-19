param(
    [string]$GatewayUrl = "http://localhost:3000",
    [string]$FrontendUrl = "http://localhost:5174",
    [string]$AdminToken = ""
)

$checks = @(
    @{ Name = "Gateway health"; Url = "$GatewayUrl/health"; Expected = @(200) },
    @{ Name = "Auth health"; Url = "http://localhost:3001/health"; Expected = @(200) },
    @{ Name = "Catalog health"; Url = "http://localhost:3002/health"; Expected = @(200) },
    @{ Name = "Order health"; Url = "http://localhost:3003/health"; Expected = @(200) },
    @{ Name = "Event health"; Url = "http://localhost:3004/health"; Expected = @(200) },
    @{ Name = "AI health"; Url = "http://localhost:8000/health"; Expected = @(200) },
    @{ Name = "Event invoices route mounted"; Url = "$FrontendUrl/api/event-invoices?page=1&limit=5"; Expected = @(200, 401, 403) },
    @{ Name = "Event my-invoices route mounted"; Url = "$FrontendUrl/api/event-invoices/my-invoices?page=1&limit=5"; Expected = @(200, 401, 403) },
    @{ Name = "Flouci verify GET remains blocked"; Url = "$FrontendUrl/api/payments/flouci/verify/fake"; Expected = @(404) ; Method = "GET" },
    @{ Name = "Flouci verify POST route mounted"; Url = "$FrontendUrl/api/payments/flouci/verify/fake"; Expected = @(200, 400, 401, 403) ; Method = "POST" }
)

$results = @()
$failed = $false

foreach ($check in $checks) {
    $method = if ($check.Method) { $check.Method } else { "GET" }

    $headers = @{}
    if ($AdminToken) {
        $headers["Authorization"] = "Bearer $AdminToken"
    }

    try {
        $response = Invoke-WebRequest -Uri $check.Url -Method $method -Headers $headers -UseBasicParsing -TimeoutSec 8
        $status = [int]$response.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        } else {
            $status = -1
        }
    }

    $ok = $check.Expected -contains $status
    if (-not $ok) { $failed = $true }

    $results += [PSCustomObject]@{
        Check = $check.Name
        Method = $method
        Status = $status
        Expected = ($check.Expected -join ",")
        Ok = $ok
    }
}

$results | Format-Table -AutoSize

if ($failed) {
    Write-Host "\nHealth check failed." -ForegroundColor Red
    exit 1
}

Write-Host "\nAll health checks passed." -ForegroundColor Green
exit 0
