from incidents import incident_is_new, incident_prompt


def test_a_new_incident_is_handled_once():
    incident = {"id": "20261120120000", "signal": "health 8085 000"}
    assert incident_is_new(incident, None)
    assert not incident_is_new(incident, "20261120120000")
    assert incident_is_new(incident, "20261120110000")


def test_prompt_names_the_signal_and_does_not_ask_for_a_code_edit():
    text = incident_prompt({"id": "9", "signal": "health 8085 000", "report": "health 8085 000"})
    assert "health 8085 000" in text
    assert "emergency" not in text.lower()
    assert "pull request" not in text.lower()
