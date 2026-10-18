# Windows twin of run-all.sh. Fat jars, Redis, Kafka, and the webapp.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
New-Item -ItemType Directory -Force -Path logs, logs\archive, .run | Out-Null
$script:toolPids = @()
function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
  Write-Host $line
  Add-Content -Path (Join-Path $root "logs\run-all.log") -Value $line -Encoding utf8
}
function Format-ProcessArg([string]$value) {
  if ($value -match '[\s"]') { return '"' + ($value -replace '"', '\"') + '"' }
  return $value
}
function Start-Logged($name, $file, $work, $argList) {
  $follow = Join-Path $root "scripts\log-follow.ps1"
  $parts = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $follow, "-Name", $name, "-FilePath", $file)
  if ($work) { $parts += @("-WorkingDirectory", $work) }
  if ($argList) { $parts += $argList }
  $command = ($parts | ForEach-Object { Format-ProcessArg $_ }) -join " "
  $proc = Start-Process -FilePath "powershell.exe" -ArgumentList $command -WindowStyle Hidden -PassThru
  $script:toolPids += $proc.Id
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "scripts\log-roll.ps1")
$rollPidFile = Join-Path $root ".run\log-roll.pid"
$rollRunning = $false
if (Test-Path $rollPidFile) {
  $oldRoll = (Get-Content $rollPidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($oldRoll -match '^\d+$' -and (Get-Process -Id ([int]$oldRoll) -ErrorAction SilentlyContinue)) { $rollRunning = $true; $script:toolPids += [int]$oldRoll }
}
if (-not $rollRunning) {
  $rollArgs = (@("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "scripts\log-roll.ps1"), "-Watch") | ForEach-Object { Format-ProcessArg $_ }) -join " "
  $roll = Start-Process -FilePath "powershell.exe" -ArgumentList $rollArgs -WindowStyle Hidden -PassThru
  Set-Content -Path $rollPidFile -Value $roll.Id
  $script:toolPids += $roll.Id
}

if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_.Split('=', 2)
  Set-Item -Path "Env:$name" -Value $value
}
function New-Secret {
  $bytes = New-Object byte[] 36
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}
$updated = $false
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = New-Secret; $updated = $true }
if (-not $env:INTERNAL_SERVICE_TOKEN) { $env:INTERNAL_SERVICE_TOKEN = New-Secret; $updated = $true }
if (-not $env:DEMO_ADMIN_PASSWORD) { $env:DEMO_ADMIN_PASSWORD = "Admin-" + (Get-Random -Maximum 999999); $updated = $true }
if (-not $env:DEMO_CUSTOMER_PASSWORD) { $env:DEMO_CUSTOMER_PASSWORD = "Customer-" + (Get-Random -Maximum 999999); $updated = $true }
if (-not $env:KEYCLOAK_ADMIN) { $env:KEYCLOAK_ADMIN = "admin"; $updated = $true }
if (-not $env:KEYCLOAK_ADMIN_PASSWORD) {
  $env:KEYCLOAK_ADMIN_PASSWORD = "Keycloak-" + [guid]::NewGuid().ToString("N")
  $updated = $true
}
if (-not $env:KEYCLOAK_URL) { $env:KEYCLOAK_URL = "http://localhost:8180"; $updated = $true }
if (-not $env:KEYCLOAK_ISSUER) { $env:KEYCLOAK_ISSUER = "http://localhost:8180/realms/apex"; $updated = $true }
if (-not $env:MINIO_ROOT_USER) { $env:MINIO_ROOT_USER = "apex"; $updated = $true }
if (-not $env:MINIO_ROOT_PASSWORD) {
  $env:MINIO_ROOT_PASSWORD = "Minio-" + [guid]::NewGuid().ToString("N")
  $updated = $true
}
if ($updated) {
  $text = Get-Content .env -Raw
  $text = $text -replace '(?m)^JWT_SECRET=.*', "JWT_SECRET=$($env:JWT_SECRET)"
  $text = $text -replace '(?m)^INTERNAL_SERVICE_TOKEN=.*', "INTERNAL_SERVICE_TOKEN=$($env:INTERNAL_SERVICE_TOKEN)"
  $text = $text -replace '(?m)^DEMO_ADMIN_PASSWORD=.*', "DEMO_ADMIN_PASSWORD=$($env:DEMO_ADMIN_PASSWORD)"
  $text = $text -replace '(?m)^DEMO_CUSTOMER_PASSWORD=.*', "DEMO_CUSTOMER_PASSWORD=$($env:DEMO_CUSTOMER_PASSWORD)"
  if ($text -notmatch '(?m)^KEYCLOAK_ADMIN=') { $text += "`r`nKEYCLOAK_ADMIN=$($env:KEYCLOAK_ADMIN)`r`n" }
  else { $text = $text -replace '(?m)^KEYCLOAK_ADMIN=.*', "KEYCLOAK_ADMIN=$($env:KEYCLOAK_ADMIN)" }
  if ($text -notmatch '(?m)^KEYCLOAK_ADMIN_PASSWORD=') { $text += "`r`nKEYCLOAK_ADMIN_PASSWORD=$($env:KEYCLOAK_ADMIN_PASSWORD)`r`n" }
  else { $text = $text -replace '(?m)^KEYCLOAK_ADMIN_PASSWORD=.*', "KEYCLOAK_ADMIN_PASSWORD=$($env:KEYCLOAK_ADMIN_PASSWORD)" }
  if ($text -notmatch '(?m)^KEYCLOAK_URL=') { $text += "`r`nKEYCLOAK_URL=$($env:KEYCLOAK_URL)`r`n" }
  else { $text = $text -replace '(?m)^KEYCLOAK_URL=.*', "KEYCLOAK_URL=$($env:KEYCLOAK_URL)" }
  if ($text -notmatch '(?m)^KEYCLOAK_ISSUER=') { $text += "`r`nKEYCLOAK_ISSUER=$($env:KEYCLOAK_ISSUER)`r`n" }
  else { $text = $text -replace '(?m)^KEYCLOAK_ISSUER=.*', "KEYCLOAK_ISSUER=$($env:KEYCLOAK_ISSUER)" }
  if ($text -notmatch '(?m)^MINIO_ROOT_USER=') { $text += "`r`nMINIO_ROOT_USER=$($env:MINIO_ROOT_USER)`r`n" }
  else { $text = $text -replace '(?m)^MINIO_ROOT_USER=.*', "MINIO_ROOT_USER=$($env:MINIO_ROOT_USER)" }
  if ($text -notmatch '(?m)^MINIO_ROOT_PASSWORD=') { $text += "`r`nMINIO_ROOT_PASSWORD=$($env:MINIO_ROOT_PASSWORD)`r`n" }
  else { $text = $text -replace '(?m)^MINIO_ROOT_PASSWORD=.*', "MINIO_ROOT_PASSWORD=$($env:MINIO_ROOT_PASSWORD)" }
  [System.IO.File]::WriteAllText((Join-Path $root ".env"), $text, (New-Object System.Text.UTF8Encoding $false))
  Write-Log "Generated local secrets in .env"
}
if (-not $env:DB_PASSWORD) { Write-Log "ERROR: set DB_PASSWORD in .env"; exit 1 }
if (-not $env:DB_HOST) { $env:DB_HOST = "localhost" }
if (-not $env:DB_PORT) { $env:DB_PORT = "5432" }
if (-not $env:DB_USERNAME) { $env:DB_USERNAME = "postgres" }

& powershell -File (Join-Path $root "scripts\init-db.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }

$jvm = "-Xms64m -Xmx256m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:MaxMetaspaceSize=192m -Xss256k"
if ($env:APEX_JVM_PROFILE -eq "full") { $jvm = "-Xms128m -Xmx512m" }

$redis = Join-Path $env:USERPROFILE ".apex-build\redis\redis-server.exe"
if (-not (Test-Path $redis)) { $redis = (Get-ChildItem -Path (Join-Path $env:USERPROFILE ".apex-build\redis") -Filter redis-server.exe -Recurse | Select-Object -First 1).FullName }
$redisCli = Join-Path (Split-Path $redis) "redis-cli.exe"
$pong = $false
if (Test-Path $redisCli) {
  try { $pong = (& $redisCli ping) -eq "PONG" } catch { $pong = $false }
}
if (-not $pong) {
  Write-Log "Starting Redis"
  Start-Logged "redis" $redis "" @("--port","6379","--maxmemory","64mb","--maxmemory-policy","allkeys-lru","--bind","127.0.0.1")
  Start-Sleep -Seconds 2
} else {
  Write-Log "Redis is already up"
}

$kafkaHome = Join-Path $env:USERPROFILE ".apex-build\kafka"
$kafkaBat = Join-Path $kafkaHome "bin\windows\kafka-server-start.bat"
$listening = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  if (-not (Test-Path $kafkaBat)) { Write-Log "ERROR: Kafka missing. Run scripts/install-deps.ps1"; exit 1 }
  $cfg = Join-Path $root ".run\kafka-server.properties"
  $logDir = (Join-Path $root ".run\kafka-logs") -replace '\\','/'
  @"
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093
listeners=PLAINTEXT://localhost:9092,CONTROLLER://localhost:9093
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
inter.broker.listener.name=PLAINTEXT
log.dirs=$logDir
num.partitions=3
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1
auto.create.topics.enable=true
log.retention.hours=24
"@ | Set-Content $cfg
  Write-Log "Starting Kafka"
  $cp = "$kafkaHome\libs\*"
  $meta = Join-Path $root ".run\kafka-logs\meta.properties"
  if (-not (Test-Path $meta)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $meta) | Out-Null
    $clusterId = (& java -Xmx128m -cp $cp kafka.tools.StorageTool random-uuid).Trim()
    & java -Xmx128m -cp $cp kafka.tools.StorageTool format -t $clusterId -c $cfg
    if ($LASTEXITCODE -ne 0) { Write-Log "ERROR: could not format Kafka storage"; exit 1 }
  }
  $kafkaLogDir = (Join-Path $root "logs") -replace '\\','/'
  $log4j = (Join-Path $root "scripts\kafka\log4j.properties") -replace '\\','/'
  $kafkaArgs = @("-Xms128m","-Xmx256m","-Dkafka.logs.dir=$kafkaLogDir","-Dlog4j.configuration=file:$log4j","-cp",$cp,"kafka.Kafka",$cfg)
  Start-Process -FilePath "java" -ArgumentList $kafkaArgs -WindowStyle Hidden -RedirectStandardOutput "NUL" -RedirectStandardError "logs\kafka.err.log"
  $ready = $false
  foreach ($i in 1..20) {
    Start-Sleep -Seconds 2
    if (Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue) { $ready = $true; break }
  }
  if (-not $ready) { Write-Log "ERROR: Kafka did not start. See logs/kafka.log and logs/kafka.err.log"; exit 1 }
}

$minioHome = Join-Path $env:USERPROFILE ".apex-build\minio"
$minio = Join-Path $minioHome "minio.exe"
if (-not $env:MINIO_API_PORT) { $env:MINIO_API_PORT = "9000" }
if (-not $env:MINIO_CONSOLE_PORT) { $env:MINIO_CONSOLE_PORT = "9001" }
if (-not (Get-NetTCPConnection -LocalPort $env:MINIO_API_PORT -State Listen -ErrorAction SilentlyContinue)) {
  if (-not (Test-Path $minio)) { Write-Log "ERROR: MinIO missing. Run scripts/install-deps.ps1"; exit 1 }
  $minioData = Join-Path $env:USERPROFILE ".apex-build\minio-data"
  New-Item -ItemType Directory -Force -Path $minioData | Out-Null
  Write-Log "Starting MinIO"
  Start-Logged "minio" $minio "" @("server", $minioData, "--address", "127.0.0.1:$($env:MINIO_API_PORT)", "--console-address", "127.0.0.1:$($env:MINIO_CONSOLE_PORT)")
  $ready = $false
  foreach ($i in 1..20) {
    Start-Sleep -Seconds 1
    if (Get-NetTCPConnection -LocalPort $env:MINIO_API_PORT -State Listen -ErrorAction SilentlyContinue) { $ready = $true; break }
  }
  if (-not $ready) { Write-Log "ERROR: MinIO did not start. See logs/minio.log"; exit 1 }
} else {
  Write-Log "MinIO is already up"
}

& powershell -File (Join-Path $root "scripts\install-keycloak.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }
$kcHome = (Get-Content .run\keycloak-home.txt -Raw).Trim()
$kcBat = Join-Path $kcHome "bin\kc.bat"
if (-not (Get-NetTCPConnection -LocalPort 8180 -State Listen -ErrorAction SilentlyContinue)) {
  Write-Log "Starting Keycloak"
  $env:KC_BOOTSTRAP_ADMIN_USERNAME = $env:KEYCLOAK_ADMIN
  $env:KC_BOOTSTRAP_ADMIN_PASSWORD = $env:KEYCLOAK_ADMIN_PASSWORD
  $env:KEYCLOAK_ADMIN = $env:KEYCLOAK_ADMIN
  Start-Logged "keycloak" $kcBat $kcHome @(
    "start-dev","--http-port=8180","--http-management-port=9002",
    "--db=postgres",
    "--db-url=jdbc:postgresql://$($env:DB_HOST):$($env:DB_PORT)/apex_keycloak",
    "--db-username=$($env:DB_USERNAME)",
    "--db-password=$($env:DB_PASSWORD)"
  )
  $ready = $false
  foreach ($i in 1..40) {
    Start-Sleep -Seconds 2
    try {
      Invoke-WebRequest -Uri "http://127.0.0.1:8180/realms/master" -UseBasicParsing -TimeoutSec 2 | Out-Null
      $ready = $true
      break
    } catch { }
  }
  if (-not $ready) { Write-Log "ERROR: Keycloak did not start. See logs/keycloak.log"; exit 1 }
} else {
  Write-Log "Keycloak is already up"
}
& powershell -File (Join-Path $root "scripts\setup-keycloak.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }

if ($args -notcontains "--no-build") {
  Write-Log "Packaging fat jars"
  mvn -B -DskipTests package
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

$pids = @()
function Start-Jar($name, $jar, $extra) {
  Write-Log "Starting $name"
  $javaArgs = @($jvm.Split(" ")) + @("-DLOG_NAME=$name", "-jar", $jar) + $extra
  $proc = Start-Process -FilePath "java" -ArgumentList $javaArgs -WindowStyle Hidden -RedirectStandardOutput "NUL" -RedirectStandardError "logs\$name.err.log" -PassThru
  $script:pids += $proc.Id
}
function Wait-Health($port, $name) {
  foreach ($i in 1..40) {
    try {
      Invoke-WebRequest -Uri "http://127.0.0.1:$port/actuator/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
      Write-Log "$name is healthy on $port"
      return
    } catch { Start-Sleep -Seconds 2 }
  }
  Write-Log "ERROR: $name did not become healthy. See logs/$name.log and logs/$name.err.log"
  exit 1
}

Start-Jar "discovery-service" "services\discovery-service\target\discovery-service-1.0.0.jar" @()
Wait-Health 8761 "discovery-service"
Start-Jar "cache-service" "services\cache-service\target\cache-service-1.0.0.jar" @()
Start-Jar "auth-service" "services\auth-service\target\auth-service-1.0.0.jar" @()
Wait-Health 8081 "auth-service"
& powershell -File (Join-Path $root "scripts\setup-keycloak.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }
Start-Jar "user-service" "services\user-service\target\user-service-1.0.0.jar" @()
Start-Jar "inventory-service" "services\inventory-service\target\inventory-service-1.0.0.jar" @()
Start-Jar "order-service" "services\order-service\target\order-service-1.0.0.jar" @()
Start-Jar "shipping-service" "services\shipping-service\target\shipping-service-1.0.0.jar" @()
Start-Jar "report-service" "services\report-service\target\report-service-1.0.0.jar" @()
Start-Jar "payment-1" "services\payment-service\target\payment-service-1.0.0.jar" @("--server.port=8085","--apex.instance-id=payment-1","--eureka.instance.instance-id=payment-1")
Wait-Health 8087 "cache-service"
Wait-Health 8085 "payment-1"
Wait-Health 8088 "report-service"
Start-Jar "payment-2" "services\payment-service\target\payment-service-1.0.0.jar" @("--server.port=8185","--apex.instance-id=payment-2","--eureka.instance.instance-id=payment-2")
Start-Jar "payment-3" "services\payment-service\target\payment-service-1.0.0.jar" @("--server.port=8285","--apex.instance-id=payment-3","--eureka.instance.instance-id=payment-3")
Start-Jar "gateway-service" "services\gateway-service\target\gateway-service-1.0.0.jar" @()
Wait-Health 8080 "gateway-service"
@($script:toolPids + $pids) | Set-Content .run\pids

if (-not (Test-Path "webapp\node_modules")) { Push-Location webapp; npm install; Pop-Location }
Write-Log "Starting webapp"
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
Start-Logged "webapp" $npm (Join-Path $root "webapp") @("run","dev")
Add-Content .run\pids $script:toolPids[-1]
Write-Log "Shop: http://localhost:5173"
