# Loads demo orders into apex_order and sales facts into apex_report.
# Re-running updates the same ids. The demo customer must already exist.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
$logDir = Join-Path $env:USERPROFILE ".apex-build"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "pump-sales.log"
function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-ddTHH:mm:ss"), $msg
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Host $line
}

try {
  if (-not (Test-Path .env)) { throw ".env is missing. Copy .env.example and set DB_PASSWORD." }
  Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $name, $value = $_.Split('=', 2)
    Set-Item -Path "Env:$name" -Value $value
  }
  if (-not $env:DB_PASSWORD) { throw "DB_PASSWORD is empty in .env" }
  if (-not $env:DB_HOST) { $env:DB_HOST = "localhost" }
  if (-not $env:DB_PORT) { $env:DB_PORT = "5432" }
  if (-not $env:DB_USERNAME) { $env:DB_USERNAME = "postgres" }
  if (-not $env:DEMO_CUSTOMER_EMAIL) { $env:DEMO_CUSTOMER_EMAIL = "customer@apexbuild.local" }

  Write-Log "Building order and sales SQL"
  node scripts\sales\emit-sales.js 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "emit-sales.js failed" }

  $psql = $null
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) { $psql = $cmd.Source } else { $psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe" }
  if (-not (Test-Path $psql)) { throw "psql not found" }
  $env:PGPASSWORD = $env:DB_PASSWORD

  $reportDb = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='apex_report'"
  if ("$reportDb".Trim() -ne "1") {
    Write-Log "Creating database apex_report"
    & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE apex_report" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not create apex_report" }
  }

  $customerId = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_auth -tAc "SELECT id FROM users WHERE email='$($env:DEMO_CUSTOMER_EMAIL)'"
  if ($LASTEXITCODE -ne 0 -or -not "$customerId".Trim()) {
    throw "Demo customer $($env:DEMO_CUSTOMER_EMAIL) was not found. Start the stack once so auth can seed it, then rerun."
  }
  $customerId = "$customerId".Trim()

  $column = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_order -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='order_lines' AND column_name='category_code'"
  if ("$column".Trim() -ne "1") {
    throw "order_lines.category_code is missing. Restart order-service so Flyway can add it, then rerun."
  }
  $facts = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_report -tAc "SELECT to_regclass('sales_facts')"
  if ("$facts".Trim() -eq "" -or "$facts".Trim() -eq "null") {
    throw "sales_facts is missing. Start report-service once so Flyway can create it, then rerun."
  }

  Write-Log "Applying orders for $customerId"
  & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_order -v ON_ERROR_STOP=1 -v "customer_id=$customerId" -f scripts\sales\orders.sql 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "Order pump failed. See $log" }
  Write-Log "Applying sales facts"
  & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_report -v ON_ERROR_STOP=1 -f scripts\sales\sales.sql 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "Sales pump failed. See $log" }
  $count = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_report -tAc "SELECT to_char(paid_on, 'YYYY-MM') || ':' || category_code || ':' || count(*)::text FROM sales_facts GROUP BY to_char(paid_on, 'YYYY-MM'), category_code ORDER BY to_char(paid_on, 'YYYY-MM'), category_code"
  if ($LASTEXITCODE -ne 0) { throw "Could not count sales facts" }
  Write-Log "Sales facts by month and category:"
  $count | ForEach-Object { if ($_.Trim()) { Write-Log $_.Trim() } }
  Write-Log "Sales pump finished. Log: $log"
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  exit 1
}
