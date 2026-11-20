"""Read-only host and service snapshots. No shell string is accepted from the model."""

import json
import re
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from .catalog import port_of, resolve


def _read(path):
    try:
        return Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def cpu_percent():
    def sample():
        parts = _read("/proc/stat").splitlines()[0].split()[1:]
        numbers = [int(part) for part in parts]
        idle = numbers[3] + (numbers[4] if len(numbers) > 4 else 0)
        return sum(numbers), idle

    try:
        total_a, idle_a = sample()
        time.sleep(0.3)
        total_b, idle_b = sample()
    except (OSError, IndexError, ValueError):
        return None
    total = total_b - total_a
    idle = idle_b - idle_a
    if total <= 0:
        return None
    return round((total - idle) / total * 100)


def memory():
    text = _read("/proc/meminfo")
    if not text:
        return None

    def pick(name):
        match = re.search(rf"{name}:\s+(\d+)", text)
        return int(match.group(1)) if match else 0

    total = pick("MemTotal")
    available = pick("MemAvailable")
    if not total:
        return None
    used = max(total - available, 0)
    return {
        "totalMb": round(total / 1024),
        "usedMb": round(used / 1024),
        "availableMb": round(available / 1024),
        "usedPercent": round(used / total * 100),
    }


def load_average():
    text = _read("/proc/loadavg")
    if not text:
        return None
    parts = text.split()
    if len(parts) < 3:
        return None
    return {"one": parts[0], "five": parts[1], "fifteen": parts[2]}


def disk(path):
    try:
        out = subprocess.check_output(["df", "-B1", str(path)], text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return None
    lines = [line for line in out.splitlines() if line.strip()]
    if len(lines) < 2:
        return None
    parts = lines[-1].split()
    if len(parts) < 5:
        return None
    try:
        total, used, avail = int(parts[1]), int(parts[2]), int(parts[3])
    except ValueError:
        return None
    return {
        "path": str(path),
        "totalMb": round(total / (1024 * 1024)),
        "usedMb": round(used / (1024 * 1024)),
        "availableMb": round(avail / (1024 * 1024)),
        "usedPercent": parts[4],
    }


def java_processes():
    try:
        out = subprocess.check_output(["ps", "-eo", "pid,pcpu,rss,args"], text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return []
    found = []
    for line in out.splitlines()[1:]:
        if "LOG_NAME=" not in line:
            continue
        match = re.search(r"LOG_NAME=([A-Za-z0-9_-]+)", line)
        if not match:
            continue
        bits = line.split(None, 3)
        if len(bits) < 3:
            continue
        try:
            rss_kb = int(bits[2])
            cpu = float(bits[1])
        except ValueError:
            continue
        found.append({
            "name": match.group(1),
            "pid": bits[0],
            "cpuPercent": cpu,
            "rssMb": round(rss_kb / 1024),
        })
    return found


def observe_host(root):
    ram = memory()
    ram_text = "unavailable"
    if ram:
        ram_text = f"{ram['usedMb']} MB of {ram['totalMb']} MB ({ram['usedPercent']}% used)"
    load = load_average()
    load_text = "unavailable" if not load else f"{load['one']} {load['five']} {load['fifteen']}"
    cpu = cpu_percent()
    disks = [item for item in (disk("/"), disk(root)) if item]
    disk_text = "unavailable"
    if disks:
        disk_text = "; ".join(
            f"{item['path']} {item['usedMb']} MB of {item['totalMb']} MB ({item['usedPercent']})"
            for item in disks
        )
    procs = java_processes()
    proc_text = "none"
    if procs:
        proc_text = "; ".join(
            f"{item['name']} pid {item['pid']} cpu {item['cpuPercent']}% rss {item['rssMb']} MB"
            for item in procs
        )
    return "\n".join([
        f"CPU {cpu if cpu is not None else 'unavailable'}%.",
        f"Load {load_text}.",
        f"Memory {ram_text}.",
        f"Disk {disk_text}.",
        f"Java processes: {proc_text}.",
    ])


def _get_json(url):
    try:
        with urllib.request.urlopen(url, timeout=3) as response:
            return json.loads(response.read().decode("utf-8", errors="replace"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        return None


def health_up(port):
    body = _get_json(f"http://127.0.0.1:{port}/actuator/health")
    if not body:
        return False
    return body.get("status") == "UP"


def heap_mb(port):
    used = _get_json(f"http://127.0.0.1:{port}/actuator/metrics/jvm.memory.used?tag=area:heap")
    maximum = _get_json(f"http://127.0.0.1:{port}/actuator/metrics/jvm.memory.max?tag=area:heap")

    def value(payload):
        try:
            return round(payload["measurements"][0]["value"] / (1024 * 1024))
        except (TypeError, KeyError, IndexError):
            return None

    return value(used), value(maximum)


def last_errors(root, name):
    hits = []
    for suffix in (".log", ".err.log"):
        file = Path(root) / "logs" / f"{name}{suffix}"
        if not file.exists():
            continue
        for line in file.read_text(encoding="utf-8", errors="replace").splitlines():
            if re.search(r"ERROR|Exception|OutOfMemoryError", line):
                hits.append(line[-180:])
    return hits[-3:]


def related_notes(heal_dir, name):
    notes = []
    heal = Path(heal_dir)
    skills_path = heal / "skills.json"
    if skills_path.exists():
        try:
            skills = json.loads(skills_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            skills = []
        for skill in skills if isinstance(skills, list) else []:
            signal = str(skill.get("signal") or "")
            if name in signal or (name.startswith("payment") and "payment" in signal):
                notes.append(f"saved skill for {signal}: {json.dumps(skill.get('actions'))}")
    open_path = heal / "open.json"
    if open_path.exists():
        try:
            incident = json.loads(open_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            incident = {}
        signal = str(incident.get("signal") or "")
        if name in signal or not name:
            notes.append(f"open incident {incident.get('id')}: {signal}")
    return notes


def observe_service(root, heal_dir, name):
    try:
        processes = resolve(name)
    except KeyError:
        return f"I don't have a process named {name}."
    rss = {item["name"]: item for item in java_processes()}
    lines = []
    for process in processes:
        port = port_of(process)
        up = health_up(port)
        used, maximum = heap_mb(port)
        proc = rss.get(process)
        rss_text = f"{proc['rssMb']} MB rss, cpu {proc['cpuPercent']}%" if proc else "process not in the list"
        heap_text = "heap unavailable"
        if used is not None or maximum is not None:
            heap_text = f"heap {used if used is not None else '?'} MB of {maximum if maximum is not None else '?'} MB"
        errors = last_errors(root, process)
        error_text = " | ".join(errors) if errors else "no recent error line"
        lines.append(f"{process} port {port} {'up' if up else 'down'}; {heap_text}; {rss_text}; {error_text}")
    notes = related_notes(heal_dir, processes[0])
    if notes:
        lines.extend(notes)
    return "\n".join(lines)
