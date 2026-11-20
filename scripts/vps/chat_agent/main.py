"""Long-poll Telegram and send each message to the LangGraph agent."""

import json
import os
import sys
import threading
import time
import urllib.parse
import urllib.request

from .actions import heal_dir
from .graph import answer, build_agent
from .incidents import incident_is_new, incident_prompt


def _token():
    token = os.environ.get("TELEGRAM_BOT_TOKEN") or ""
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    return token


def _chat_id():
    chat_id = os.environ.get("TELEGRAM_CHAT_ID") or ""
    if not chat_id:
        raise RuntimeError("TELEGRAM_CHAT_ID is not set")
    return str(chat_id)


def _api(method, payload):
    data = urllib.parse.urlencode(payload).encode()
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{_token()}/{method}",
        data=data,
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        return json.loads(response.read().decode("utf-8"))


def send(chat_id, text):
    body = text or "I don't have a reply."
    for start in range(0, len(body), 4000):
        _api("sendMessage", {"chat_id": chat_id, "text": body[start:start + 4000]})


def offset_path():
    return heal_dir() / "telegram.offset"


def read_offset():
    path = offset_path()
    if not path.exists():
        return 0
    try:
        return int(path.read_text(encoding="utf-8").strip() or "0")
    except ValueError:
        return 0


def write_offset(value):
    path = offset_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(value), encoding="utf-8")


def read_incident():
    path = heal_dir() / "open.json"
    if not path.exists():
        return None
    try:
        incident = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not incident.get("id"):
        return None
    return incident


def incident_is_pending(incident):
    claimed = heal_dir() / "incident.claimed"
    claimed_text = claimed.read_text(encoding="utf-8") if claimed.exists() else None
    return incident_is_new(incident, claimed_text)


def claim_incident(incident):
    path = heal_dir() / "incident.claimed"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(incident.get("id")), encoding="utf-8")


def main():
    chat_id = _chat_id()
    agent = build_agent()
    lock = threading.Lock()
    offset = read_offset()
    while True:
        incident = read_incident()
        if incident and incident_is_pending(incident) and lock.acquire(blocking=False):
            claim_incident(incident)
            prompt = incident_prompt(incident)
            incident_id = incident.get("id")

            def resolve(user_text=prompt, opened=incident_id):
                try:
                    send(chat_id, f"Incident {opened}. Looking.")
                    send(chat_id, answer(agent, chat_id, user_text))
                except Exception as exc:
                    send(chat_id, f"Incident {opened} failed. {exc}")
                finally:
                    lock.release()

            threading.Thread(target=resolve, daemon=True).start()
        try:
            body = _api("getUpdates", {"timeout": 25, "offset": offset})
        except Exception as exc:
            sys.stderr.write(f"telegram poll failed: {exc}\n")
            time.sleep(5)
            continue
        for update in body.get("result") or []:
            offset = update["update_id"] + 1
            write_offset(offset)
            message = update.get("message") or {}
            if str(message.get("chat", {}).get("id")) != chat_id:
                continue
            text = message.get("text") or ""
            if not text:
                continue
            if not lock.acquire(blocking=False):
                send(chat_id, "Still on the last one.")
                continue

            def work(user_text=text):
                try:
                    send(chat_id, "Looking.")
                    send(chat_id, answer(agent, chat_id, user_text))
                except Exception as exc:
                    send(chat_id, f"That run failed. {exc}")
                finally:
                    lock.release()

            threading.Thread(target=work, daemon=True).start()
