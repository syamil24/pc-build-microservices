import json

from skills import record_skill


def test_record_replaces_the_same_signal(tmp_path):
    record_skill(tmp_path, "health 8085 000", [{"op": "restart", "service": "payment-1"}], "restart it")
    record_skill(tmp_path, "health 8085 000", [{"op": "heap", "service": "payment-1", "mb": 320}], "raise the heap")
    skills = json.loads((tmp_path / "skills.json").read_text(encoding="utf-8"))
    assert len(skills) == 1
    assert skills[0]["signal"] == "health 8085 000"
    assert skills[0]["recovered"] is True
    assert skills[0]["actions"] == [{"op": "heap", "service": "payment-1", "mb": 320}]
    assert skills[0]["reply"] == "raise the heap"


def test_record_keeps_a_different_signal(tmp_path):
    record_skill(tmp_path, "one", [{"op": "restart", "service": "order-service"}], "a")
    record_skill(tmp_path, "two", [{"op": "restart", "service": "gateway-service"}], "b")
    signals = [item["signal"] for item in json.loads((tmp_path / "skills.json").read_text(encoding="utf-8"))]
    assert signals == ["one", "two"]
