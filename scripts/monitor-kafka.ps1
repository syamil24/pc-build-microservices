# Prints a snapshot of the local Kafka broker: cluster, topics, partitions,
# offsets, consumer lag, log directories, recent events, and the broker text log.
# Kafka's own .bat tools overflow the Windows command line, so this calls java
# with libs\* the same way run-all.ps1 starts the broker.
# -Watch refreshes the live sections. Recent events are printed on a single run.
param(
  [switch]$Watch,
  [int]$Events = 8
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Read-Setting([string]$name, [string]$fallback) {
  $current = [Environment]::GetEnvironmentVariable($name)
  if ($current) { return $current }
  $path = Join-Path $root ".env"
  if (Test-Path $path) {
    foreach ($line in Get-Content $path) {
      if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
      $key, $value = $line.Split('=', 2)
      if ($key.Trim() -eq $name -and $value.Trim()) { return $value.Trim() }
    }
  }
  return $fallback
}

function Test-Broker([string]$bootstrap) {
  $hostName, $portText = $bootstrap.Split(':', 2)
  $port = 9092
  if ($portText) { [void][int]::TryParse($portText, [ref]$port) }
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect($hostName, $port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host ("=" * 72)
  Write-Host $title
  Write-Host ("=" * 72)
}

$bootstrap = Read-Setting "KAFKA_BOOTSTRAP_SERVERS" "localhost:9092"
$kafkaHome = $env:KAFKA_HOME
if (-not $kafkaHome) { $kafkaHome = Join-Path $env:USERPROFILE ".apex-build\kafka" }
$cp = Join-Path $kafkaHome "libs\*"
$log4j = ((Join-Path $root "scripts\kafka\tools-log4j.properties") -replace '\\', '/')
if (-not (Test-Path (Join-Path $kafkaHome "libs\kafka-tools-3.9.0.jar"))) {
  Write-Host "Kafka tools are not installed at $kafkaHome. Run scripts/install-deps.ps1 first."
  exit 1
}
if (-not (Test-Broker $bootstrap)) {
  Write-Host "Kafka is not accepting connections at $bootstrap."
  Write-Host "Start the stack with scripts/run-all.ps1, then run this again."
  exit 1
}

function Invoke-Kafka {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$ToolArgs)
  & java -Xmx128m "-Dlog4j.configuration=file:$log4j" -cp $cp @ToolArgs
}

function Get-KafkaLines {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$ToolArgs)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $lines = @( & java -Xmx128m "-Dlog4j.configuration=file:$log4j" -cp $cp @ToolArgs 2>$null )
  $ErrorActionPreference = $previous
  return @($lines | ForEach-Object { "$_".TrimEnd() } | Where-Object { $_ -ne "" })
}

function Get-OffsetMap([string]$when) {
  $map = @{}
  $lines = Get-KafkaLines org.apache.kafka.tools.GetOffsetShell --bootstrap-server $bootstrap --exclude-internal-topics --time $when
  foreach ($line in $lines) {
    if ($line -match '^(.*):(\d+):(-?\d+)$') {
      $map["$($Matches[1])|$($Matches[2])"] = [int64]$Matches[3]
    }
  }
  return ,$map
}

function Show-Kafka([switch]$IncludeEvents) {
  Write-Host "Apex Build  Kafka"
  Write-Host "bootstrap   $bootstrap"
  Write-Host "time        $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

  Write-Section "Cluster"
  Invoke-Kafka org.apache.kafka.tools.ClusterTool cluster-id --bootstrap-server $bootstrap
  Invoke-Kafka org.apache.kafka.tools.MetadataQuorumCommand --bootstrap-server $bootstrap describe --status

  Write-Section "Topics and partitions"
  $listed = @(Get-KafkaLines org.apache.kafka.tools.TopicCommand --bootstrap-server $bootstrap --list)
  $internal = @($listed | Where-Object { $_.StartsWith("__") })
  if ($internal.Count -gt 0) {
    Write-Host ("Internal topics: " + ($internal -join ", "))
  }
  $describe = @(Get-KafkaLines org.apache.kafka.tools.TopicCommand --bootstrap-server $bootstrap --describe)
  $skip = $false
  foreach ($line in $describe) {
    if ($line -match 'Topic:\s+__') { $skip = $true; continue }
    if ($line -match 'Topic:\s+') { $skip = $false }
    if (-not $skip) { Write-Host $line }
  }

  Write-Section "Offsets"
  $earliest = Get-OffsetMap "earliest"
  $latest = Get-OffsetMap "latest"
  $names = New-Object System.Collections.Generic.HashSet[string]
  foreach ($name in $latest.Keys) { [void]$names.Add([string]$name) }
  foreach ($name in $earliest.Keys) { [void]$names.Add([string]$name) }
  $keys = @($names | Sort-Object)
  if ($keys.Count -eq 0) {
    Write-Host "No user topics yet."
  } else {
    "{0,-32} {1,9} {2,10} {3,10} {4,10}" -f "TOPIC", "PARTITION", "EARLIEST", "LATEST", "MESSAGES"
    foreach ($key in $keys) {
      $bar = $key.LastIndexOf("|")
      $topic = $key.Substring(0, $bar)
      $partition = $key.Substring($bar + 1)
      $start = 0
      $end = 0
      if ($earliest.ContainsKey($key)) { $start = $earliest[$key] }
      if ($latest.ContainsKey($key)) { $end = $latest[$key] }
      $count = $end - $start
      if ($count -lt 0) { $count = 0 }
      "{0,-32} {1,9} {2,10} {3,10} {4,10}" -f $topic, $partition, $start, $end, $count
    }
  }

  Write-Section "Consumer groups"
  $groups = @(Get-KafkaLines org.apache.kafka.tools.consumer.group.ConsumerGroupCommand --bootstrap-server $bootstrap --list)
  if ($groups.Count -eq 0) {
    Write-Host "No consumer groups."
  } else {
    Invoke-Kafka org.apache.kafka.tools.consumer.group.ConsumerGroupCommand --bootstrap-server $bootstrap --describe --all-groups
  }

  Write-Section "Partition logs"
  $dirLines = @(Get-KafkaLines org.apache.kafka.tools.LogDirsCommand --bootstrap-server $bootstrap --describe)
  $json = $dirLines | Where-Object { $_.StartsWith("{") } | Select-Object -Last 1
  if (-not $json) {
    Write-Host "No log directory report."
  } else {
    $doc = $json | ConvertFrom-Json
    "{0,-40} {1,12} {2,10}" -f "PARTITION", "BYTES", "OFFSET LAG"
    foreach ($broker in @($doc.brokers)) {
      foreach ($dir in @($broker.logDirs)) {
        Write-Host ("broker " + $broker.broker + "  " + $dir.logDir)
        foreach ($part in @($dir.partitions) | Sort-Object partition) {
          if ($part.partition -like "__*") { continue }
          "{0,-40} {1,12} {2,10}" -f $part.partition, $part.size, $part.offsetLag
        }
      }
    }
  }

  Write-Section "Broker text log"
  $brokerLog = Join-Path $root "logs\kafka.log"
  if (Test-Path $brokerLog) {
    Get-Content $brokerLog -Tail 12 | ForEach-Object { Write-Host $_ }
  } else {
    Write-Host "logs/kafka.log is not there yet."
  }

  if ($IncludeEvents) {
    Write-Section "Recent events"
    $shown = $false
    foreach ($key in $keys) {
      $bar = $key.LastIndexOf("|")
      $topic = $key.Substring(0, $bar)
      $partition = $key.Substring($bar + 1)
      $startAt = 0
      $endAt = 0
      if ($earliest.ContainsKey($key)) { $startAt = $earliest[$key] }
      if ($latest.ContainsKey($key)) { $endAt = $latest[$key] }
      if ($endAt -le $startAt) { continue }
      $from = $endAt - $Events
      if ($from -lt $startAt) { $from = $startAt }
      $want = $endAt - $from
      $shown = $true
      Write-Host ""
      Write-Host "$topic  partition $partition  from offset $from"
      Invoke-Kafka org.apache.kafka.tools.consumer.ConsoleConsumer `
        --bootstrap-server $bootstrap `
        --topic $topic `
        --partition $partition `
        --offset "$from" `
        --max-messages "$want" `
        --timeout-ms 4000 `
        --property print.timestamp=true `
        --property print.key=true `
        --property print.partition=true `
        --property print.offset=true
    }
    if (-not $shown) { Write-Host "No events stored." }
  }
}

if ($Watch) {
  while ($true) {
    Clear-Host
    Show-Kafka
    Write-Host ""
    Write-Host "Refreshing every 5s. Ctrl+C to stop. Run without -Watch to print recent events."
    Start-Sleep -Seconds 5
  }
} else {
  Show-Kafka -IncludeEvents
}
