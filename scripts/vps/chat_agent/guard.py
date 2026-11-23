"""Decides when a code edit is allowed. The model cannot talk itself into one."""

import re


def emergency_allowed(message):
    text = message or ""
    lowered = text.lower()
    if re.search(r"\bemergency\b", lowered):
        return True
    if re.search(r"\bpull request\b|\bopen a pr\b|\bcreate a pr\b|\bgithub pr\b", lowered):
        return True
    if re.search(r"\b(edit|change|fix|patch)\b.{0,40}\b(code|source|java)\b", lowered):
        return True
    if re.search(r"\b(code|source|java)\b.{0,40}\b(edit|change|fix|patch)\b", lowered):
        return True
    return False


def asked_to_apply(message):
    return bool(re.search(r"\b(restart|redeploy|package|deploy)\b", message or "", re.I))


CATASTROPHIC_COMMANDS = (
    r"\bmkfs\b",
    r"\b(shutdown|reboot|halt|poweroff)\b",
    r"\brm\s+[^;|&]*\s+/\s*($|[ ;|&])",
    r":\(\)\s*\{",
    r"\bchmod\s+-R\s+[0-7]*7[0-7]*\s+/\s*($|[ ;|&])",
    r"\bdd\b[^|]*\bof=/dev/",
    r"\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z|da)?sh\b",
)

CHANGE_COMMANDS = (
    r"\b(rm|rmdir|shred|mv|kill|pkill|killall|truncate|chmod|chown|chgrp|useradd|userdel|usermod|passwd|dd|mkfs)\b",
    r"\b(apt|apt-get|yum|dnf|pip3?|npm|npx|yarn|gem|cargo)\b\s+(install|uninstall|remove|purge|update|upgrade)",
    r"\bsystemctl\s+(start|stop|restart|reload|disable|enable|mask)\b",
    r"\bgit\s+(push|reset|clean|restore|rebase|revert|commit|merge)\b",
    r"\bsudo\b",
    r"(?<![0-9&])>{1,2}(?!&)\s*\S",
)

RUN_ASK = r"\b(run|execute|exec|shell|command|terminal|cmd|install|uninstall|delete|remove|kill|stop|start|restart|reload|write|commit|push|merge|clean|reset)\b"


def _matches(patterns, text):
    return any(re.search(pattern, text or "", re.I) for pattern in patterns)


def command_allowed(message, command):
    """A read-only command always runs. A command that changes the box or its
    files runs only when the user's own message asked to run something. The
    catastrophic list is refused no matter what the user said."""
    text = command or ""
    if _matches(CATASTROPHIC_COMMANDS, text):
        return False
    if _matches(CHANGE_COMMANDS, text) and not re.search(RUN_ASK, message or "", re.I):
        return False
    return True
