# Prints a snapshot of the local Redis: server, memory, hit rate, and the first 100 keys with their values.
# -Watch refreshes the same view every 5 seconds.
param(
  [switch]$Watch,
  [int]$Limit = 100
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

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host ("=" * 72)
  Write-Host $title
  Write-Host ("=" * 72)
}

function Find-RedisCli {
  if ($env:REDIS_CLI -and (Test-Path $env:REDIS_CLI)) { return $env:REDIS_CLI }
  $bundled = Join-Path $env:USERPROFILE ".apex-build\redis\redis-cli.exe"
  if (Test-Path $bundled) { return $bundled }
  $cmd = Get-Command redis-cli -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$cli = Find-RedisCli
if (-not $cli) {
  Write-Host "redis-cli was not found. Run scripts/install-deps.ps1 first."
  exit 1
}
$hostName = Read-Setting "REDIS_HOST" "localhost"
$port = Read-Setting "REDIS_PORT" "6379"

function Invoke-Redis {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$RedisArgs)
  & $cli -h $hostName -p $port --raw @RedisArgs
}

$pong = Invoke-Redis PING 2>$null
if ($pong -notcontains "PONG") {
  Write-Host "Redis is not accepting connections at ${hostName}:${port}."
  Write-Host "Start the stack with scripts/run-all.ps1, then run this again."
  exit 1
}

function Get-InfoMap([string]$section) {
  $map = @{}
  foreach ($line in @(Invoke-Redis INFO $section)) {
    $text = "$line".Trim()
    if ($text -match '^([^:#]+):(.+)$') { $map[$Matches[1]] = $Matches[2].Trim() }
  }
  return $map
}

function Get-RedisKeys {
  $cursor = "0"
  $found = New-Object System.Collections.Generic.List[string]
  $guard = 0
  do {
    $guard++
    if ($guard -gt 50) { break }
    $reply = @(Invoke-Redis SCAN $cursor MATCH "*" COUNT 200 | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
    if ($reply.Count -eq 0) { break }
    $cursor = "$($reply[0])"
    if ($reply.Count -gt 1) {
      $reply[1..($reply.Count - 1)] | ForEach-Object { [void]$found.Add($_) }
    }
  } while ($cursor -ne "0")
  return @($found | Sort-Object -Unique)
}

function Show-Field($map, [string]$label, [string]$name) {
  $value = "-"
  if ($map.ContainsKey($name) -and $map[$name]) { $value = $map[$name] }
  "{0,-28} {1}" -f $label, $value
}

function Show-Redis {
  $server = Get-InfoMap "server"
  $memory = Get-InfoMap "memory"
  $stats = Get-InfoMap "stats"
  $clients = Get-InfoMap "clients"
  $keyspace = Get-InfoMap "keyspace"
  $dbsize = "$(@(Invoke-Redis DBSIZE | Where-Object { "$_" -match '^\d+$' }) | Select-Object -Last 1)"

  Write-Host "Apex Build  Redis"
  Write-Host "address     ${hostName}:${port}"
  Write-Host "time        $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

  Write-Section "Server"
  Show-Field $server "version" "redis_version"
  Show-Field $server "mode" "redis_mode"
  Show-Field $server "uptime seconds" "uptime_in_seconds"
  Show-Field $clients "connected clients" "connected_clients"
  "{0,-28} {1}" -f "keys", $dbsize

  Write-Section "Memory"
  Show-Field $memory "used" "used_memory_human"
  Show-Field $memory "peak" "used_memory_peak_human"
  Show-Field $memory "max" "maxmemory_human"
  Show-Field $memory "policy" "maxmemory_policy"
  Show-Field $memory "fragmentation" "mem_fragmentation_ratio"
  Show-Field $stats "evicted keys" "evicted_keys"
  Show-Field $stats "expired keys" "expired_keys"

  Write-Section "Traffic"
  Show-Field $stats "commands" "total_commands_processed"
  Show-Field $stats "ops/sec" "instantaneous_ops_per_sec"
  Show-Field $stats "hits" "keyspace_hits"
  Show-Field $stats "misses" "keyspace_misses"
  foreach ($name in @($keyspace.Keys | Sort-Object)) {
    "{0,-28} {1}" -f $name, $keyspace[$name]
  }

  Write-Section "Keys and values"
  $keys = @(Get-RedisKeys)
  if ($keys.Count -eq 0) {
    Write-Host "No keys."
    return
  }
  $shown = @($keys | Select-Object -First $Limit)
  Write-Host ("first " + $shown.Count + " of " + $keys.Count + " keys")
  $index = 0
  foreach ($key in $shown) {
    $index++
    $type = "$(@(Invoke-Redis TYPE $key) | Select-Object -Last 1)".Trim()
    $ttl = "$(@(Invoke-Redis TTL $key) | Select-Object -Last 1)".Trim()
    if ($ttl -eq "-1") { $ttl = "none" }
    $bytes = "$(@(Invoke-Redis MEMORY USAGE $key) | Select-Object -Last 1)".Trim()
    $value = Get-RedisValue $key $type
    Write-Host ""
    Write-Host ("[{0}] {1}" -f $index, $key)
    Write-Host ("    {0}   ttl {1}   {2} bytes" -f $type, $ttl, $bytes)
    Write-Host ("    " + $value)
  }
}

function Get-RedisValue([string]$key, [string]$type) {
  $raw = ""
  if ($type -eq "string") {
    $raw = (@(Invoke-Redis GET $key) | ForEach-Object { "$_" }) -join " "
  } elseif ($type -eq "hash") {
    $raw = (@(Invoke-Redis HGETALL $key) | ForEach-Object { "$_" }) -join " "
  } elseif ($type -eq "list") {
    $raw = (@(Invoke-Redis LRANGE $key 0 20) | ForEach-Object { "$_" }) -join " "
  } elseif ($type -eq "set") {
    $raw = (@(Invoke-Redis SMEMBERS $key) | Select-Object -First 20 | ForEach-Object { "$_" }) -join " "
  } elseif ($type -eq "zset") {
    $raw = (@(Invoke-Redis ZRANGE $key 0 20 WITHSCORES) | ForEach-Object { "$_" }) -join " "
  }
  $raw = ("$raw" -replace '\s+', ' ').Trim()
  if (-not $raw) { return "(empty)" }
  if ($raw.Length -gt 500) { return $raw.Substring(0, 500) + "..." }
  return $raw
}

if ($Watch) {
  while ($true) {
    Clear-Host
    Show-Redis
    Write-Host ""
    Write-Host "Refreshing every 5s. Ctrl+C to stop."
    Start-Sleep -Seconds 5
  }
} else {
  Show-Redis
}
