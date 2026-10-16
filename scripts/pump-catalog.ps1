# Loads scripts/catalog/catalog.sql into apex_inventory. Re-running updates the same SKUs.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
$logDir = Join-Path $env:USERPROFILE ".apex-build"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "pump-catalog.log"
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

  Write-Log "Building catalog SQL"
  node scripts\catalog\emit-sql.js 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "emit-sql.js failed" }

  $psql = $null
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) { $psql = $cmd.Source } else { $psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe" }
  if (-not (Test-Path $psql)) { throw "psql not found" }
  $env:PGPASSWORD = $env:DB_PASSWORD
  Write-Log "Applying catalog to apex_inventory on $($env:DB_HOST):$($env:DB_PORT)"
  & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_inventory -v ON_ERROR_STOP=1 -f scripts\catalog\catalog.sql 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "psql failed. See $log" }
  $count = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_inventory -tAc "SELECT category_code || ':' || count(*)::text FROM products GROUP BY category_code ORDER BY category_code"
if ($LASTEXITCODE -ne 0) { throw "Could not count products. See $log" }
  Write-Log "Products by category:"
  $count | ForEach-Object { Write-Log $_.Trim() }
  Write-Log "Catalog pump finished. Log: $log"
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  if ($_.ScriptStackTrace) { Add-Content -Path $log -Value $_.ScriptStackTrace }
  exit 1
}
