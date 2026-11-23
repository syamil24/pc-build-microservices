from history import sanitize, window


def test_paired_tool_turn_is_kept():
    history = [
        {"type": "user", "content": "look"},
        {"type": "ai", "content": "", "tool_calls": [{"id": "call-1", "name": "observe", "args": {}}]},
        {"type": "tool", "content": "result", "tool_call_id": "call-1"},
        {"type": "ai", "content": "answer"},
    ]
    assert sanitize(history) == history


def test_orphan_tool_result_is_dropped():
    history = [
        {"type": "user", "content": "hi"},
        {"type": "tool", "content": "old result", "tool_call_id": "call-1"},
        {"type": "ai", "content": "done"},
    ]
    assert sanitize(history) == [
        {"type": "user", "content": "hi"},
        {"type": "ai", "content": "done"},
    ]


def test_tool_call_without_a_result_is_dropped():
    history = [
        {"type": "user", "content": "look"},
        {"type": "ai", "content": "", "tool_calls": [{"id": "call-1", "name": "observe", "args": {}}]},
        {"type": "user", "content": "again"},
    ]
    assert sanitize(history) == [
        {"type": "user", "content": "look"},
        {"type": "user", "content": "again"},
    ]


def test_dangling_tool_call_keeps_its_text_without_the_calls():
    history = [
        {"type": "user", "content": "look"},
        {"type": "ai", "content": "I will check.", "tool_calls": [{"id": "call-1", "name": "observe", "args": {}}]},
        {"type": "user", "content": "again"},
    ]
    assert sanitize(history) == [
        {"type": "user", "content": "look"},
        {"type": "ai", "content": "I will check.", "tool_calls": []},
        {"type": "user", "content": "again"},
    ]


def test_window_starting_mid_turn_moves_to_the_next_user_turn():
    history = [
        {"type": "ai", "content": "", "tool_calls": [{"id": "call-1", "name": "observe", "args": {}}]},
        {"type": "tool", "content": "result", "tool_call_id": "call-1"},
        {"type": "ai", "content": "answer"},
        {"type": "user", "content": "next"},
    ]
    assert sanitize(history) == [{"type": "user", "content": "next"}]


def test_partially_answered_parallel_calls_keep_the_answered_one():
    history = [
        {"type": "user", "content": "look"},
        {"type": "ai", "content": "", "tool_calls": [
            {"id": "call-1", "name": "observe", "args": {}},
            {"id": "call-2", "name": "observe", "args": {}},
        ]},
        {"type": "tool", "content": "one", "tool_call_id": "call-1"},
        {"type": "ai", "content": "answer"},
    ]
    repaired = sanitize(history)
    kept = repaired[1]["tool_calls"]
    assert [call["id"] for call in kept] == ["call-1"]


def test_window_keeps_system_messages_and_trims_to_the_limit():
    history = [{"type": "system", "content": "sys"}]
    for i in range(30):
        history += [
            {"type": "user", "content": f"m{i}"},
            {"type": "ai", "content": f"a{i}"},
        ]
    trimmed = window(history, 40)
    assert trimmed[0] == {"type": "system", "content": "sys"}
    assert _role(trimmed[1]) == "user"
    assert len(trimmed) == 41


def _role(message):
    return message["type"]
