"""Service actions. The model picks an op. It does not get a shell."""

import contextvars
import json
import os
import subprocess
from pathlib import Path

from .catalog import PROTECTED, module_of, port_of, resolve
from .guard import asked_to_apply, emergency_allowed
from .observe import health_up
from .skills import record_skill

USER_MESSAGE = contextvars.ContextVar("apex_user_message", default="")


def root_dir():
    return Path(os.environ.get("APEX_ROOT") or Path(__file__).resolve().parents[3])


def heal_dir():
    return Path(os.environ.get("APEX_HEAL_DIR") or (Path.home() / ".apex-heal"))


def _run(args, timeout=120):
    result = subprocess.run(
        args,
        cwd=root_dir(),
        text=True,
        capture_output=True,
        timeout=timeout,
        check=False,
    )
    output = (result.stdout or "") + (result.stderr or "")
    return result.returncode, output.strip()


def _shop(args):
    return _run(["bash", str(root_dir() / "scripts" / "vps" / "shop.sh"), *args], timeout=180)


def _apply(actions):
    heal = heal_dir()
    heal.mkdir(parents=True, exist_ok=True)
    path = heal / "chat-decision.json"
    path.write_text(json.dumps({"actions": actions}), encoding="utf-8")
    return _run(
        ["node", str(root_dir() / "scripts" / "vps" / "apply-actions.mjs"), str(path), "confirmed"],
        timeout=900,
    )


def _named_by_user(name):
    return name.lower() in (USER_MESSAGE.get() or "").lower()


def _coerce(raw):
    text = str(raw).strip()
    lowered = text.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if text.lstrip("-").isdigit():
        return int(text)
    return text


def _application_file(module):
    path = (root_dir() / "services" / module / "src" / "main" / "resources" / "application.yml").resolve()
    root = root_dir().resolve()
    if root not in path.parents or path.name != "application.yml":
        raise ValueError("That path is not a service application.yml.")
    if not path.exists():
        raise ValueError(f"Missing {path}.")
    return path


def _set_yaml_key(path, dotted, raw):
    from ruamel.yaml import YAML

    parts = [part for part in str(dotted).split(".") if part and part not in (".", "..")]
    if not parts or ".".join(parts) != str(dotted).strip("."):
        raise ValueError("The key has to be a dotted path such as apex.chip.mode.")
    yaml = YAML()
    yaml.preserve_quotes = True
    with path.open(encoding="utf-8") as handle:
        data = yaml.load(handle)
    if data is None:
        data = {}
    cursor = data
    for part in parts[:-1]:
        nxt = cursor.get(part) if hasattr(cursor, "get") else None
        if not isinstance(nxt, dict):
            from ruamel.yaml.comments import CommentedMap
            nxt = CommentedMap()
            cursor[part] = nxt
        cursor = nxt
    cursor[parts[-1]] = _coerce(raw)
    with path.open("w", encoding="utf-8") as handle:
        yaml.dump(data, handle)


def _maybe_record(processes, actions, detail):
    heal = heal_dir()
    open_path = heal / "open.json"
    if not open_path.exists():
        return detail + "\nNo incident is open, so no skill was stored."
    try:
        incident = json.loads(open_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return detail + "\nThe open incident file could not be read, so no skill was stored."
    ports = [port_of(process) for process in processes]
    if not ports or not all(health_up(port) for port in ports):
        return detail + "\nHealth is still down, so no skill was stored."
    signal = incident.get("signal") or ""
    record_skill(heal, signal, actions, USER_MESSAGE.get())
    open_path.unlink(missing_ok=True)
    return detail + f"\nHealth is back. Stored a skill for {signal}."


def operate_service(name: str, op: str, key: str = "", value: str = "", mb: int = 0) -> str:
    """Restart, stop, resize, read logs, smoke-test, roll back, or set one application.yml key for a named service.

    op is one of restart, stop, heap, logs, smoke, rollback, config.
    heap needs mb. config needs key and value, then packages that module and restarts the named process.
    `payment` means payment-1, payment-2, and payment-3. postgres, kafka, keycloak, and redis are refused
    unless the user message names that service, and they still cannot be restarted here.
    """
    cleaned = (name or "").strip()
    operation = (op or "").strip().lower()
    if cleaned in PROTECTED:
        if not _named_by_user(cleaned):
            return f"Refusing to touch {cleaned} unless you name it."
        if operation != "stop":
            return f"I don't restart or reconfigure {cleaned} from here."
        code, output = _shop(["stop", cleaned])
        if code != 0:
            return output or f"stop {cleaned} failed"
        return output or f"stopped {cleaned}"

    if operation == "rollback":
        if "rollback" not in (USER_MESSAGE.get() or "").lower():
            return "Refusing to roll back unless you ask for a rollback."
        code, output = _apply([{"op": "rollback"}])
        if code != 0:
            return output[-1500:] or "rollback failed"
        return _maybe_record(["gateway-service"], [{"op": "rollback"}], output[-1500:] or "rolled back one commit and redeployed")

    try:
        processes = resolve(cleaned)
    except KeyError:
        return f"I don't have a process named {cleaned}."

    if operation == "config":
        if not key or value == "":
            return "A config change needs the service, the YAML key, and the new value."
        if str(key).lower() not in (USER_MESSAGE.get() or "").lower():
            return "Tell me the YAML key and the new value in your message."
        module = module_of(processes[0])
        try:
            path = _application_file(module)
            _set_yaml_key(path, key, value)
        except (ValueError, OSError) as exc:
            return str(exc)
        code, output = _run(
            ["mvn", "-B", "-pl", f"services/{module}", "-am", "-DskipTests", "package"],
            timeout=900,
        )
        if code != 0:
            return f"Edited {path} but packaging failed.\n{output[-1500:]}"
        code, restart_out = _shop(["restart", cleaned])
        detail = f"Set {key} in {path.name} for {module}, packaged, and restarted {cleaned}."
        if code != 0:
            return detail + f"\nRestart failed.\n{restart_out[-1500:]}"
        if cleaned == "payment-1":
            detail += " payment-2 and payment-3 are still running the config they already loaded."
        actions = [{"op": "config", "service": process, "key": key, "value": value} for process in processes]
        return _maybe_record(processes, actions, detail + (f"\n{restart_out}" if restart_out else ""))

    if operation == "heap":
        if not mb:
            return "A heap change needs the service and a size in MB."
        actions = [{"op": "heap", "service": process, "mb": int(mb)} for process in processes]
    elif operation == "restart":
        actions = [{"op": "restart", "service": cleaned}]
    elif operation == "stop":
        actions = [{"op": "stop", "service": process} for process in processes]
    elif operation == "logs":
        actions = [{"op": "logs", "service": process} for process in processes]
    elif operation == "smoke":
        actions = [{"op": "smoke"}]
    else:
        return "op must be restart, stop, heap, logs, smoke, rollback, or config."

    code, output = _apply(actions)
    if code != 0:
        return output[-1500:] or f"{operation} failed"
    if operation in ("logs", "smoke"):
        return output[-1500:] or operation
    return _maybe_record(processes, actions, output[-1500:] or f"{operation} {cleaned}")


def emergency_fix(instruction: str) -> str:
    """Edit Java and open a heal pull request. Refuses the call unless the user's own message asked for a code change, a pull request, or an emergency."""
    message = USER_MESSAGE.get()
    if not emergency_allowed(message):
        return "Refusing to edit code. Ask for an emergency, a code change, or a pull request."
    if not os.environ.get("CURSOR_API_KEY"):
        return "CURSOR_API_KEY is not set, so I cannot edit the Java."
    code, output = _run(
        ["node", str(root_dir() / "scripts" / "vps" / "emergency-edit.mjs"), instruction or message],
        timeout=900,
    )
    if code != 0:
        return output[-1500:] or "The code edit failed."
    incident_id = "manual"
    open_path = heal_dir() / "open.json"
    if open_path.exists():
        try:
            incident_id = json.loads(open_path.read_text(encoding="utf-8")).get("id") or incident_id
        except json.JSONDecodeError:
            pass
    push_code, push_out = _run(["bash", str(root_dir() / "scripts" / "vps" / "heal-push.sh"), str(incident_id)], timeout=180)
    detail = (output + "\n" + push_out).strip()
    if push_code != 0:
        return detail[-1500:] or "The edit landed but the pull request was not opened."
    if not asked_to_apply(message):
        return (detail + "\nThe running jars were left as they are.")[-1500:]
    names = _services_in_message(message)
    if not names:
        return (detail + "\nNo service was named, so nothing was packaged or restarted.")[-1500:]
    modules = []
    for name in names:
        for process in resolve(name):
            module = module_of(process)
            if module not in modules:
                modules.append(module)
    code, package_out = _run(
        ["mvn", "-B", "-pl", ",".join(f"services/{module}" for module in modules), "-am", "-DskipTests", "package"],
        timeout=900,
    )
    if code != 0:
        return (detail + "\nPackaging failed.\n" + package_out)[-1500:]
    restarted = []
    for name in names:
        code, restart_out = _shop(["restart", name])
        restarted.append(restart_out or f"restarted {name}")
        if code != 0:
            return (detail + "\n" + "\n".join(restarted))[-1500:]
    return (detail + "\n" + "\n".join(restarted))[-1500:]


def _services_in_message(message):
    from .catalog import SERVICES

    specific = [name for name in SERVICES if f" {name} " in f" {message} "]
    if specific:
        return specific
    if " payment " in f" {message} " or " payment-service " in f" {message} ":
        return ["payment"]
    return []
