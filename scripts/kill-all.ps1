# Stops Apex Build jars, the shop, and the Redis and Kafka processes this repo starts.
# Does not stop PostgreSQL.
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$tools = Join-Path $env:USERPROFILE ".apex-build"
function Write-Log($msg) { Write-Host ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-ddTHH:mm:ss"), $msg) }

$pidFile = Join-Path $root ".run\pids"
if (Test-Path $pidFile) {
  Get-Content $pidFile | ForEach-Object {
    if ($_ -match '^\d+$') {
      Stop-Process -Id ([int]$_) -Force -ErrorAction SilentlyContinue
      Write-Log "Stopped pid $_"
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$ports = 6379, 9092, 5173, 8080, 8081, 8082, 8083, 8084, 8085, 8185, 8285, 8086, 8087, 8088, 8761, 8180, 9000, 9001
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
  $cmd = $_.CommandLine
  if (-not $cmd) { return }
  $match = $cmd -like "*$root*" -or $cmd -like "*$tools*" -or $cmd -like "*kafka.Kafka*" -or $cmd -like "*kafka-server-start*" -or $cmd -like "*keycloak*"
  if (-not $match -and ($_.Name -eq "redis-server.exe" -or $_.Name -eq "minio.exe")) { $match = $true }
  if (-not $match) { return }
  if ($_.Name -match 'java|node|redis-server|minio|cmd') {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Log "Stopped $($_.Name) $($_.ProcessId)"
  }
}

Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort } | ForEach-Object {
  $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -match 'java|node|redis-server|minio|npm') {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Write-Log "Stopped $($proc.ProcessName) on port $($_.LocalPort)"
  }
}

Write-Log "Apex Build, the shop, Redis, and Kafka are stopped. PostgreSQL was left running."
