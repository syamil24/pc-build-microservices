$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pidFile = Join-Path $root ".run\pids"
if (Test-Path $pidFile) {
  Get-Content $pidFile | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  Remove-Item $pidFile -Force
}
Get-Process -Name redis-server, java -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*apex-build*" -or $_.MainWindowTitle -like "*kafka*" } | Out-Null
Write-Host "Stopped processes listed in .run\pids"
