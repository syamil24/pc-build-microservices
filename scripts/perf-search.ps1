# Times the same million-row lookups through Postgres, Redis, linear search, and binary search.
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$jar = Join-Path $root "scripts\perf\target\perf-demo.jar"
$stale = -not (Test-Path $jar)
if (-not $stale) {
    $jarTime = (Get-Item $jar).LastWriteTime
    $newer = Get-ChildItem (Join-Path $root "scripts\perf\src"), (Join-Path $root "scripts\perf\pom.xml") -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt $jarTime } |
        Select-Object -First 1
    $stale = $null -ne $newer
}
if ($stale) {
    & mvn -B -f (Join-Path $root "scripts\perf\pom.xml") -DskipTests package
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& java -cp $jar com.apexbuild.perf.PerfSearch @Rest
exit $LASTEXITCODE
