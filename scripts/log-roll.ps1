# Moves finished logs into logs/archive and deletes archives older than 90 days.
# The file being written today stays in the logs folder. -Watch repeats this every
# few minutes so Kafka's midnight rename is picked up while the stack is still up.
# -Directory is for tests.
param(
  [switch]$Watch,
  [string]$Directory = ""
)

$ErrorActionPreference = "Continue"
$retentionDays = 90
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Remove-Expired([string]$archive) {
  if (-not (Test-Path $archive)) { return }
  $cutoff = (Get-Date).Date.AddDays(-$retentionDays)
  Get-ChildItem $archive -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $when = $_.LastWriteTime
    if ($_.Name -match "(\d{4}-\d{2}-\d{2})") {
      try {
        $when = [datetime]::ParseExact($Matches[1], "yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture)
      } catch { }
    }
    if ($when.Date -lt $cutoff) {
      Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }
  }
}

function Move-IntoArchive([string]$source, [string]$dest) {
  if (Test-Path $dest) { return }
  Move-Item $source $dest -Force -ErrorAction SilentlyContinue
}

function Roll-Folder([string]$dir, [string]$archive, [switch]$ToolLogsOnly) {
  New-Item -ItemType Directory -Force -Path $dir, $archive | Out-Null
  $today = (Get-Date).ToString("yyyy-MM-dd")
  Get-ChildItem $dir -File -ErrorAction SilentlyContinue | ForEach-Object {
    if ($ToolLogsOnly -and $_.Name -notmatch "^(install|pump-.+)\.log$") { return }
    if ($_.Name -match "^(.+)\.log\.(\d{4}-\d{2}-\d{2})(?:-(\d{2}))?$") {
      $destName = if ($Matches[3]) { "$($Matches[1]).$($Matches[2])-$($Matches[3]).log" } else { "$($Matches[1]).$($Matches[2]).log" }
      Move-IntoArchive $_.FullName (Join-Path $archive $destName)
      return
    }
    if ($_.Name -notlike "*.log") { return }
    $written = $_.LastWriteTime.ToString("yyyy-MM-dd")
    if ($written -ge $today) { return }
    $dest = Join-Path $archive "$($_.BaseName).$written.log"
    Move-IntoArchive $_.FullName $dest
  }
  Remove-Expired $archive
}

function Invoke-LogRoll {
  if ($Directory) {
    Roll-Folder $Directory (Join-Path $Directory "archive")
    return
  }
  Roll-Folder (Join-Path $root "logs") (Join-Path $root "logs\archive")
  $homeLogs = Join-Path $env:USERPROFILE ".apex-build"
  if (Test-Path $homeLogs) {
    Roll-Folder $homeLogs (Join-Path $homeLogs "log-archive") -ToolLogsOnly
  }
}

Invoke-LogRoll
if ($Watch) {
  while ($true) {
    Start-Sleep -Seconds 300
    try { Invoke-LogRoll } catch { }
  }
}
