# Windows twin of run-all.sh. Fat jars, Redis, Kafka, and the webapp.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
New-Item -ItemType Directory -Force -Path logs, .run | Out-Null
function Write-Log($msg) { Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg) }

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
if ($updated) {
  $text = Get-Content .env
  $text = $text -replace '^JWT_SECRET=.*', "JWT_SECRET=$($env:JWT_SECRET)"
  $text = $text -replace '^INTERNAL_SERVICE_TOKEN=.*', "INTERNAL_SERVICE_TOKEN=$($env:INTERNAL_SERVICE_TOKEN)"
  $text = $text -replace '^DEMO_ADMIN_PASSWORD=.*', "DEMO_ADMIN_PASSWORD=$($env:DEMO_ADMIN_PASSWORD)"
  $text = $text -replace '^DEMO_CUSTOMER_PASSWORD=.*', "DEMO_CUSTOMER_PASSWORD=$($env:DEMO_CUSTOMER_PASSWORD)"
  Set-Content .env $text
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
  Start-Process -FilePath $redis -ArgumentList "--port","6379","--maxmemory","64mb","--maxmemory-policy","allkeys-lru","--bind","127.0.0.1" -WindowStyle Hidden -RedirectStandardOutput logs\redis.log -RedirectStandardError logs\redis.err.log
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
  $log4j = (Join-Path $kafkaHome "config\log4j.properties") -replace '\\','/'
  $meta = Join-Path $root ".run\kafka-logs\meta.properties"
  if (-not (Test-Path $meta)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $meta) | Out-Null
    $clusterId = (& java -Xmx128m -cp $cp kafka.tools.StorageTool random-uuid).Trim()
    & java -Xmx128m -cp $cp kafka.tools.StorageTool format -t $clusterId -c $cfg
    if ($LASTEXITCODE -ne 0) { Write-Log "ERROR: could not format Kafka storage"; exit 1 }
  }
  $kafkaLogDir = (Join-Path $root ".run\kafka-file-logs") -replace '\\','/'
  New-Item -ItemType Directory -Force -Path (Join-Path $root ".run\kafka-file-logs") | Out-Null
  $kafkaArgs = @("-Xms128m","-Xmx256m","-Dkafka.logs.dir=$kafkaLogDir","-Dlog4j.configuration=file:$log4j","-cp",$cp,"kafka.Kafka",$cfg)
  Start-Process -FilePath "java" -ArgumentList $kafkaArgs -WindowStyle Hidden -RedirectStandardOutput logs\kafka.log -RedirectStandardError logs\kafka.err.log
  $ready = $false
  foreach ($i in 1..20) {
    Start-Sleep -Seconds 2
    if (Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue) { $ready = $true; break }
  }
  if (-not $ready) { Write-Log "ERROR: Kafka did not start. See logs/kafka.err.log"; exit 1 }
}

if ($args -notcontains "--no-build") {
  Write-Log "Packaging fat jars"
  mvn -B -DskipTests package
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

$pids = @()
function Start-Jar($name, $jar, $extra) {
  Write-Log "Starting $name"
  $javaArgs = @($jvm.Split(" ")) + @("-jar", $jar) + $extra
  $proc = Start-Process -FilePath "java" -ArgumentList $javaArgs -WindowStyle Hidden -RedirectStandardOutput "logs\$name.log" -RedirectStandardError "logs\$name.err.log" -PassThru
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
  Write-Log "ERROR: $name did not become healthy. See logs/$name.err.log"
  exit 1
}

Start-Jar "discovery-service" "services\discovery-service\target\discovery-service-1.0.0.jar" @()
Wait-Health 8761 "discovery-service"
Start-Jar "cache-service" "services\cache-service\target\cache-service-1.0.0.jar" @()
Start-Jar "auth-service" "services\auth-service\target\auth-service-1.0.0.jar" @()
Start-Jar "user-service" "services\user-service\target\user-service-1.0.0.jar" @()
Start-Jar "inventory-service" "services\inventory-service\target\inventory-service-1.0.0.jar" @()
Start-Jar "order-service" "services\order-service\target\order-service-1.0.0.jar" @()
Start-Jar "shipping-service" "services\shipping-service\target\shipping-service-1.0.0.jar" @()
Start-Jar "payment-1" "services\payment-service\target\payment-service-1.0.0.jar" @("--server.port=8085","--apex.instance-id=payment-1","--eureka.instance.instance-id=payment-1")
Wait-Health 8087 "cache-service"
Wait-Health 8085 "payment-1"
Start-Jar "payment-2" "services\payment-service\target\payment-service-1.0.0.jar" @("--server.port=8185","--apex.instance-id=payment-2","--eureka.instance.instance-id=payment-2")
Start-Jar "payment-3" "services\payment-service\target\payment-service-1.0.0.jar" @("--server.port=8285","--apex.instance-id=payment-3","--eureka.instance.instance-id=payment-3")
Start-Jar "gateway-service" "services\gateway-service\target\gateway-service-1.0.0.jar" @()
Wait-Health 8080 "gateway-service"
$pids | Set-Content .run\pids

if (-not (Test-Path "webapp\node_modules")) { Push-Location webapp; npm install; Pop-Location }
Write-Log "Starting webapp"
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$web = Start-Process -FilePath $npm -ArgumentList "run","dev" -WorkingDirectory (Join-Path $root "webapp") -WindowStyle Hidden -RedirectStandardOutput logs\webapp.log -RedirectStandardError logs\webapp.err.log -PassThru
Add-Content .run\pids $web.Id
Write-Log "Shop: http://localhost:5173"
Write-Log "Customer: $($env:DEMO_CUSTOMER_EMAIL) / $($env:DEMO_CUSTOMER_PASSWORD)"
Write-Log "Admin: $($env:DEMO_ADMIN_EMAIL) / $($env:DEMO_ADMIN_PASSWORD)"
