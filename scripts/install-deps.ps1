# Installs Redis and Kafka for the Windows machine that is driving this repo.
# JDK, Maven, Node, and PostgreSQL are expected to already be installed.
$ErrorActionPreference = "Stop"
$logDir = Join-Path $env:USERPROFILE ".apex-build"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "install.log"
function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-ddTHH:mm:ss"), $msg
  Write-Host $line
  Add-Content -Path $log -Value $line
}
function Invoke-Logged($file, $argList) {
  Write-Log "RUN: $file $argList"
  $out = & $file @argList 2>&1 | Out-String
  Add-Content -Path $log -Value $out
  if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
    Write-Log "ERROR: $file failed with exit $LASTEXITCODE"
    Write-Host $out
    exit 1
  }
}

Write-Log "Windows dependency install"
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { Write-Log "ERROR: Java is not on PATH"; exit 1 }
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) { Write-Log "ERROR: Maven is not on PATH"; exit 1 }

$tools = Join-Path $env:USERPROFILE ".apex-build"
$redisDir = Join-Path $tools "redis"
if (-not (Test-Path (Join-Path $redisDir "redis-server.exe"))) {
  Write-Log "Downloading Redis 5.0.14.1 for Windows"
  $zip = Join-Path $tools "redis.zip"
  Invoke-WebRequest -Uri "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip" -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $redisDir -Force
}
$kafkaDir = Join-Path $tools "kafka"
if (-not (Test-Path (Join-Path $kafkaDir "bin\windows\kafka-server-start.bat"))) {
  Write-Log "Downloading Kafka 3.9.0"
  $tgz = Join-Path $tools "kafka.tgz"
  Invoke-WebRequest -Uri "https://archive.apache.org/dist/kafka/3.9.0/kafka_2.13-3.9.0.tgz" -OutFile $tgz
  tar -xzf $tgz -C $tools
  if (Test-Path $kafkaDir) { Remove-Item $kafkaDir -Recurse -Force }
  Rename-Item (Join-Path $tools "kafka_2.13-3.9.0") $kafkaDir
}
Write-Log "Redis: $redisDir"
Write-Log "Kafka: $kafkaDir"
Write-Log "Done. Log: $log"
