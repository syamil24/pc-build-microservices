# Creates the apex realm, the apex-web client, and the demo users in Keycloak.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
function Write-Log($msg) { Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg) }

if (-not (Test-Path .env)) { throw ".env is missing" }
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_.Split('=', 2)
  Set-Item -Path "Env:$name" -Value $value
}
if (-not $env:KEYCLOAK_URL) { $env:KEYCLOAK_URL = "http://localhost:8180" }
if (-not $env:KEYCLOAK_ADMIN) { $env:KEYCLOAK_ADMIN = "admin" }
if (-not $env:DB_HOST) { $env:DB_HOST = "localhost" }
if (-not $env:DB_PORT) { $env:DB_PORT = "5432" }
if (-not $env:DB_USERNAME) { $env:DB_USERNAME = "postgres" }
if (-not $env:KEYCLOAK_ADMIN_PASSWORD) { throw "Set KEYCLOAK_ADMIN_PASSWORD in .env to the Keycloak master admin password." }

$psql = $null
$cmd = Get-Command psql -ErrorAction SilentlyContinue
if ($cmd) { $psql = $cmd.Source } else { $psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe" }
if ((Test-Path $psql) -and $env:DB_PASSWORD) {
  $env:PGPASSWORD = $env:DB_PASSWORD
  $table = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_auth -tAc "SELECT to_regclass('public.users')"
  $tableName = "$table".Trim()
  if ($LASTEXITCODE -ne 0) {
    Write-Log "Could not read apex_auth. Continuing without shop account ids."
  } elseif (-not $tableName -or $tableName -eq "null") {
    Write-Log "apex_auth.users does not exist yet. Realm setup continues, and account ids are linked after auth-service starts."
  } else {
    $customer = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_auth -tAc "SELECT id FROM users WHERE lower(email) = lower('$($env:DEMO_CUSTOMER_EMAIL)')"
    $admin = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_auth -tAc "SELECT id FROM users WHERE lower(email) = lower('$($env:DEMO_ADMIN_EMAIL)')"
    if ($LASTEXITCODE -ne 0) { throw "Could not read shop accounts from apex_auth.users" }
    if ($customer) { $env:APEX_CUSTOMER_ID = (($customer | Out-String) -replace '\s', '') }
    if ($admin) { $env:APEX_ADMIN_ID = (($admin | Out-String) -replace '\s', '') }
    Write-Log ("Shop ids: customer " + $(if ($env:APEX_CUSTOMER_ID) { "found" } else { "missing" }) + ", admin " + $(if ($env:APEX_ADMIN_ID) { "found" } else { "missing" }))
  }
}

Write-Log "Configuring the apex realm"
node scripts\keycloak\setup-realm.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Log "Keycloak is ready for the shop"
