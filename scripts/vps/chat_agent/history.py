"""Conversation window repair. Gemini rejects a history whose tool turns are
unpaired or whose first turn is not a user turn, so every model call gets a
repaired window: orphan tool results dropped, tool calls without a result
dropped or stripped, and anything before the first user turn removed."""


_ROLE_ALIASES = {"human": "user", "assistant": "ai"}


def _role(message):
    if hasattr(message, "type"):
        role = message.type
    elif isinstance(message, dict):
        role = message.get("type") or message.get("role") or ""
    else:
        return ""
    return _ROLE_ALIASES.get(role, role)


def _call_id_of(call):
    if isinstance(call, dict):
        return call.get("id")
    return getattr(call, "id", None)


def _tool_calls_of(message):
    calls = getattr(message, "tool_calls", None)
    if calls is None and isinstance(message, dict):
        calls = message.get("tool_calls")
    return list(calls or [])


def _tool_call_id(message):
    call_id = getattr(message, "tool_call_id", None)
    if call_id is None and isinstance(message, dict):
        call_id = message.get("tool_call_id")
    return call_id


def _has_text(message):
    content = getattr(message, "content", None)
    if content is None and isinstance(message, dict):
        content = message.get("content")
    return bool(content)


def _strip_calls(message, keep_ids):
    calls = [call for call in _tool_calls_of(message) if _call_id_of(call) in keep_ids]
    if isinstance(message, dict):
        edited = dict(message)
        edited["tool_calls"] = calls
        return edited
    return message.model_copy(update={"tool_calls": calls})


def _drop_unpaired(messages):
    answered = {_tool_call_id(m) for m in messages if _role(m) == "tool"}
    answered.discard(None)
    cleaned = []
    open_ids = set()
    for message in messages:
        role = _role(message)
        if role == "tool":
            call_id = _tool_call_id(message)
            if call_id and call_id in open_ids:
                cleaned.append(message)
                open_ids.discard(call_id)
            continue
        if role == "ai":
            ids = {_call_id_of(call) for call in _tool_calls_of(message)}
            ids.discard(None)
            if ids:
                keep = ids & answered
                if keep:
                    cleaned.append(_strip_calls(message, keep))
                    open_ids.update(keep)
                elif _has_text(message):
                    cleaned.append(_strip_calls(message, set()))
                continue
        cleaned.append(message)
    return cleaned


def sanitize(messages):
    """Return the longest suffix of `messages` a provider will accept."""
    messages = list(messages)
    while messages:
        messages = _drop_unpaired(messages)
        if not messages or _role(messages[0]) == "user":
            return messages
        messages = messages[1:]
    return []


def window(messages, limit=40):
    """Keep leading system messages plus the repaired latest `limit` messages."""
    messages = list(messages)
    system = []
    while messages and _role(messages[0]) == "system":
        system.append(messages[0])
        messages = messages[1:]
    return system + sanitize(messages[-limit:])
