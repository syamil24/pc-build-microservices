# Points Apex at the installed Keycloak, or downloads 25.0.4 when it is missing.
# A downloaded copy uses a new Postgres database, apex_keycloak, in the same style as a local keycloak.conf.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
New-Item -ItemType Directory -Force -Path .run | Out-Null
function Write-Log($msg) { Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg) }

$installed = "H:\PNB Job\keycloak-25.0.4"
if ($env:KEYCLOAK_HOME -and (Test-Path (Join-Path $env:KEYCLOAK_HOME "bin\kc.bat"))) {
  $installed = $env:KEYCLOAK_HOME
}
if (Test-Path (Join-Path $installed "bin\kc.bat")) {
  Set-Content -Path .run\keycloak-home.txt -Value $installed -Encoding ascii
  Write-Log "Using installed Keycloak at $installed"
  exit 0
}

$home = Join-Path $env:USERPROFILE ".apex-build\keycloak"
$bat = Join-Path $home "bin\kc.bat"
if (-not (Test-Path $bat)) {
  Write-Log "Downloading Keycloak 25.0.4"
  $zip = Join-Path $env:USERPROFILE ".apex-build\keycloak-25.0.4.zip"
  New-Item -ItemType Directory -Force -Path (Split-Path $zip) | Out-Null
  Invoke-WebRequest -Uri "https://github.com/keycloak/keycloak/releases/download/25.0.4/keycloak-25.0.4.zip" -OutFile $zip
  $extract = Join-Path $env:USERPROFILE ".apex-build\keycloak-extract"
  if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $extract -Force
  if (Test-Path $home) { Remove-Item $home -Recurse -Force }
  Rename-Item (Join-Path $extract "keycloak-25.0.4") $home
  Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue
}
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_.Split('=', 2)
  if (-not (Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue).Value) {
    Set-Item -Path "Env:$name" -Value $value
  }
}
if (-not $env:DB_HOST) { $env:DB_HOST = "localhost" }
if (-not $env:DB_PORT) { $env:DB_PORT = "5432" }
if (-not $env:DB_USERNAME) { $env:DB_USERNAME = "postgres" }
$dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }
$conf = @"
db=postgres
db-username=$($env:DB_USERNAME)
db-password=$dbPassword
db-url=jdbc:postgresql://$($env:DB_HOST):$($env:DB_PORT)/apex_keycloak
http-enabled=true
hostname-strict=false
health-enabled=true
"@
[System.IO.File]::WriteAllText((Join-Path $home "conf\keycloak.conf"), $conf, (New-Object System.Text.UTF8Encoding $false))
Set-Content -Path .run\keycloak-home.txt -Value $home -Encoding ascii
Write-Log "Installed Keycloak at $home (database apex_keycloak)"
