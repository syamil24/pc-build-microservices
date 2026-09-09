#!/usr/bin/env bash
# Loads the MovieLens million ratings into Postgres and Redis, then prints how long each side took.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
jar="$root/scripts/perf/target/perf-demo.jar"
if [[ ! -f "$jar" ]] || [[ -n "$(find "$root/scripts/perf/src" "$root/scripts/perf/pom.xml" -newer "$jar" -print -quit 2>/dev/null)" ]]; then
  mvn -B -f "$root/scripts/perf/pom.xml" -DskipTests package
fi
exec java -cp "$jar" com.apexbuild.perf.PerfImport "$@"
