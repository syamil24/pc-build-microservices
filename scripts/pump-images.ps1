# Draws catalog art, uploads it to MinIO, and stores each public URL on the product row.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
$logDir = Join-Path $env:USERPROFILE ".apex-build"
New-Item -ItemType Directory -Force -Path $logDir, logs | Out-Null
$log = Join-Path $logDir "pump-images.log"
function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-ddTHH:mm:ss"), $msg
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Host $line
}
function Save-EnvLine($name, $value) {
  $path = Join-Path $root ".env"
  $text = [System.IO.File]::ReadAllText($path)
  if ($text -match ("(?m)^" + [regex]::Escape($name) + "=.*")) {
    $text = [regex]::Replace($text, "(?m)^" + [regex]::Escape($name) + "=.*", ($name + "=" + $value))
  } else {
    if (-not $text.EndsWith("`n")) { $text += "`r`n" }
    $text += $name + "=" + $value + "`r`n"
  }
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding $false))
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
  if (-not $env:MINIO_ROOT_USER) {
    $env:MINIO_ROOT_USER = "apex"
    Save-EnvLine "MINIO_ROOT_USER" $env:MINIO_ROOT_USER
  }
  if (-not $env:MINIO_ROOT_PASSWORD) {
    $env:MINIO_ROOT_PASSWORD = "Minio-" + [guid]::NewGuid().ToString("N")
    Save-EnvLine "MINIO_ROOT_PASSWORD" $env:MINIO_ROOT_PASSWORD
    Write-Log "Saved a new MinIO password in .env"
  }
  if (-not $env:MINIO_API_PORT) { $env:MINIO_API_PORT = "9000" }
  if (-not $env:MINIO_CONSOLE_PORT) { $env:MINIO_CONSOLE_PORT = "9001" }
  if (-not $env:MINIO_BUCKET) { $env:MINIO_BUCKET = "catalog" }
  if (-not $env:MINIO_PUBLIC_URL) { $env:MINIO_PUBLIC_URL = "http://127.0.0.1:$($env:MINIO_API_PORT)" }

  $minioHome = Join-Path $env:USERPROFILE ".apex-build\minio"
  $minio = Join-Path $minioHome "minio.exe"
  $mc = Join-Path $minioHome "mc.exe"
  if (-not (Test-Path $minio) -or -not (Test-Path $mc)) { throw "MinIO is missing. Run scripts/install-deps.ps1" }

  if (-not (Get-NetTCPConnection -LocalPort $env:MINIO_API_PORT -State Listen -ErrorAction SilentlyContinue)) {
    $data = Join-Path $env:USERPROFILE ".apex-build\minio-data"
    New-Item -ItemType Directory -Force -Path $data | Out-Null
    Write-Log "Starting MinIO"
    Start-Process -FilePath $minio -ArgumentList @("server", $data, "--address", "127.0.0.1:$($env:MINIO_API_PORT)", "--console-address", "127.0.0.1:$($env:MINIO_CONSOLE_PORT)") -WindowStyle Hidden -RedirectStandardOutput logs\minio.log -RedirectStandardError logs\minio.err.log
    $ready = $false
    foreach ($i in 1..20) {
      Start-Sleep -Seconds 1
      if (Get-NetTCPConnection -LocalPort $env:MINIO_API_PORT -State Listen -ErrorAction SilentlyContinue) { $ready = $true; break }
    }
    if (-not $ready) { throw "MinIO did not start. See logs/minio.err.log" }
  } else {
    Write-Log "MinIO is already up"
  }

  Write-Log "Drawing catalog images"
  node scripts\images\emit-images.js 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "emit-images.js failed" }
  node scripts\images\emit-house-images.js 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "emit-house-images.js failed" }

  $api = "$($env:MINIO_PUBLIC_URL)".TrimEnd("/")
  Write-Log "Uploading to $api/$($env:MINIO_BUCKET)"
  & $mc alias set apex $api $env:MINIO_ROOT_USER $env:MINIO_ROOT_PASSWORD | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "mc alias failed" }
  & $mc mb --ignore-existing "apex/$($env:MINIO_BUCKET)" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "mc mb failed" }
  & $mc anonymous set download "apex/$($env:MINIO_BUCKET)" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "mc anonymous failed" }
  & $mc cp --recursive --attr "Content-Type=image/svg+xml" "scripts\images\out\" "apex/$($env:MINIO_BUCKET)/"
  if ($LASTEXITCODE -ne 0) { throw "mc cp failed" }

  $psql = $null
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) { $psql = $cmd.Source } else { $psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe" }
  if (-not (Test-Path $psql)) { throw "psql not found" }
  $env:PGPASSWORD = $env:DB_PASSWORD
  Write-Log "Saving image URLs on apex_inventory"
  & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_inventory -v ON_ERROR_STOP=1 -f scripts\images\image-urls.sql 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "psql failed. See $log" }
  & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_inventory -v ON_ERROR_STOP=1 -f scripts\images\image-urls-house.sql 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "psql failed. See $log" }
  $count = & $psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d apex_inventory -tAc "SELECT count(*) FROM products WHERE image_url IS NOT NULL"
  Write-Log "Products with an image URL: $($count.Trim())"
  Write-Log "Done"
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  exit 1
}
