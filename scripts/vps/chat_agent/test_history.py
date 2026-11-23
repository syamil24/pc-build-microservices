from history import sanitize, window


def test_paired_tool_turn_is_kept():
    history = [
        {"type": "human", "content": "look"},
        {"type": "ai", "content": "", "tool_calls": [{"id": "call-1", "name": "observe", "args": {}}]},
        {"type": "tool", "content": "result", "tool_call_id": "call-1"},
        {"type": "ai", "content": "answer"},
    ]
    assert sanitize(history) == history


def test_orphan_tool_result_is_dropped():
    history = [
        {"type": "human", "content": "hi"},
        {"type": "tool", "content": "old result", "tool_call_id": "call-1"},
        {"type": "ai", "content": "done"},
    ]
    assert sanitize(history) == [
        {"type": "human", "content": "hi"},
        {"type": "ai", "content": "done"},
    ]


def test_tool_call_without_a_result_is_dropped():
    history = [
        {"type": "human", "content": "look"},
        {"type": "ai", "content": "", "tool_calls": [{"id": "call-1", "name": "observe", "args": {}}]},
        {"type": "human", "content": "again"},
    ]
    assert sanitize(history) == [
        {"type": "human", "content": "look"},
        {"type": "human", "content": "again"},
    ]


def test_dangling_tool_call_keeps_its_text_without_the_calls():
    history = [
        {"type": "human", "content": "look"},
        {"type": "ai", "content": "I will check.", "tool_calls": [{"id": "call-1", "name": "observe", "args": {}}]},
        {"type": "human", "content": "again"},
    ]
    assert sanitize(history) == [
        {"type": "human", "content": "look"},
        {"type": "ai", "content": "I will check.", "tool_calls": []},
        {"type": "human", "content": "again"},
    ]


def test_window_starting_mid_turn_moves_to_the_next_user_turn():
    history = [
        {"type": "ai", "content": "", "tool_calls": [{"id": "call-1", "name": "observe", "args": {}}]},
        {"type": "tool", "content": "result", "tool_call_id": "call-1"},
        {"type": "ai", "content": "answer"},
        {"type": "human", "content": "next"},
    ]
    assert sanitize(history) == [{"type": "human", "content": "next"}]


def test_partially_answered_parallel_calls_keep_the_answered_one():
    history = [
        {"type": "human", "content": "look"},
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
            {"type": "human", "content": f"m{i}"},
            {"type": "ai", "content": f"a{i}"},
        ]
    trimmed = window(history, 40)
    assert trimmed[0] == {"type": "system", "content": "sys"}
    assert trimmed[1]["type"] == "human"
    assert len(trimmed) == 41


def test_real_langchain_messages_are_not_all_dropped():
    from langchain.messages import AIMessage, HumanMessage, ToolMessage

    history = [
        HumanMessage("how is payment"),
        AIMessage("", tool_calls=[{"name": "observe_service", "args": {"name": "payment"}, "id": "call-1"}]),
        ToolMessage("ok", tool_call_id="call-1"),
        AIMessage("it is up"),
        HumanMessage("good"),
    ]
    trimmed = window(history, 40)
    assert [type(message).__name__ for message in trimmed] == [
        "HumanMessage",
        "AIMessage",
        "ToolMessage",
        "AIMessage",
        "HumanMessage",
    ]
