"""Recovered fixes in the shape monitor.sh already reads back."""

import json
from pathlib import Path


def record_skill(heal_dir, signal, actions, reply):
    heal = Path(heal_dir)
    heal.mkdir(parents=True, exist_ok=True)
    path = heal / "skills.json"
    current = []
    if path.exists():
        parsed = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(parsed, list):
            current = parsed
    kept = [skill for skill in current if skill.get("signal") != signal]
    entry = {
        "signal": signal,
        "actions": actions,
        "recovered": True,
        "reply": reply or "",
    }
    kept.append(entry)
    path.write_text(json.dumps(kept, indent=2) + "\n", encoding="utf-8")
    return entry
