$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $name, $value = $_.Split('=', 2)
    Set-Item -Path "Env:$name" -Value $value
  }
}
if (-not $env:DB_PASSWORD) { Write-Host "ERROR: DB_PASSWORD is empty in .env"; exit 1 }
$cmd = Get-Command psql -ErrorAction SilentlyContinue
if ($cmd) { $psql = $cmd.Source } else { $psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe" }
if (-not (Test-Path $psql)) { Write-Host "ERROR: psql not found"; exit 1 }
$env:PGPASSWORD = $env:DB_PASSWORD
Write-Host "Checking PostgreSQL"
& $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d postgres -v ON_ERROR_STOP=1 -c "SELECT version();"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: could not connect. Check DB_PASSWORD."; exit 1 }
foreach ($db in @("apex_auth","apex_user","apex_inventory","apex_order","apex_payment","apex_shipping")) {
  $exists = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" 2>$null
  $existsText = ""
  if ($exists) { $existsText = "$exists".Trim() }
  if ($existsText -eq "1") { Write-Host "Database $db already exists" }
  else {
    Write-Host "Creating database $db"
    & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $db"
    if ($LASTEXITCODE -ne 0) { exit 1 }
  }
}
Write-Host "Databases are ready. Flyway creates tables when the services start."
