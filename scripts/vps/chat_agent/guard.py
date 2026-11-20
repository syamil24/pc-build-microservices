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
