# Runs a tool and writes its output to logs/<name>.log.
# At midnight the file is moved to logs/archive/<name>.yyyy-MM-dd.log and a new day starts.
param(
  [Parameter(Mandatory = $true, Position = 0)][string]$Name,
  [Parameter(Mandatory = $true, Position = 1)][string]$FilePath,
  [string]$WorkingDirectory = "",
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logs = Join-Path $root "logs"
$archive = Join-Path $logs "archive"
New-Item -ItemType Directory -Force -Path $logs, $archive | Out-Null
$active = Join-Path $logs "$Name.log"

if (Test-Path $active) {
  $written = (Get-Item $active).LastWriteTime
  if ($written.Date -lt (Get-Date).Date) {
    $dest = Join-Path $archive ("{0}.{1}.log" -f $Name, $written.ToString("yyyy-MM-dd"))
    if (-not (Test-Path $dest)) { Move-Item $active $dest -Force }
  }
}

$start = New-Object System.Diagnostics.ProcessStartInfo
$start.FileName = $FilePath
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$start.CreateNoWindow = $true
if ($WorkingDirectory) { $start.WorkingDirectory = $WorkingDirectory }
if ($CommandArgs -and $CommandArgs.Count -gt 0) {
  $quoted = foreach ($arg in $CommandArgs) {
    if ($arg -match '[\s"]') { '"' + ($arg -replace '"', '\"') + '"' } else { $arg }
  }
  $start.Arguments = $quoted -join " "
}

$lines = [System.Collections.ArrayList]::Synchronized((New-Object System.Collections.ArrayList))
$process = New-Object System.Diagnostics.Process
$process.StartInfo = $start
$process.EnableRaisingEvents = $true
$onLine = {
  if ($null -ne $EventArgs.Data) { [void]$Event.MessageData.Add($EventArgs.Data) }
}
Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $onLine -MessageData $lines | Out-Null
Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $onLine -MessageData $lines | Out-Null
[void]$process.Start()
$process.BeginOutputReadLine()
$process.BeginErrorReadLine()

$utf8 = New-Object System.Text.UTF8Encoding $false
$day = (Get-Date).ToString("yyyy-MM-dd")
$writer = New-Object System.IO.StreamWriter($active, $true, $utf8)
$writer.AutoFlush = $true

function Switch-Day {
  $now = (Get-Date).ToString("yyyy-MM-dd")
  if ($now -eq $script:day) { return }
  $script:writer.Close()
  $dest = Join-Path $archive "$Name.$($script:day).log"
  if ((Test-Path $active) -and -not (Test-Path $dest)) { Move-Item $active $dest -Force }
  $script:day = $now
  $script:writer = New-Object System.IO.StreamWriter($active, $true, $utf8)
  $script:writer.AutoFlush = $true
}

try {
  $quiet = 0
  while ($true) {
    Switch-Day
    if ($lines.Count -gt 0) {
      $quiet = 0
      while ($lines.Count -gt 0) {
        $line = $lines[0]
        $lines.RemoveAt(0)
        $script:writer.WriteLine($line)
      }
    } elseif ($process.HasExited) {
      $quiet++
      if ($quiet -ge 5) { break }
    }
    Start-Sleep -Milliseconds 100
  }
} finally {
  if ($script:writer) { $script:writer.Close() }
  Get-EventSubscriber | Unregister-Event -ErrorAction SilentlyContinue
  if (-not $process.HasExited) {
    try { $process.Kill() } catch { }
  }
}
if ($null -ne $process.ExitCode) { exit $process.ExitCode }
exit 0
