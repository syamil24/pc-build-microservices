"""Incidents written by the health monitor. The chat agent is the only resolver."""


def incident_is_new(incident, claimed_text):
    if not incident or not incident.get("id"):
        return False
    if claimed_text is None:
        return True
    return str(claimed_text).strip() != str(incident.get("id"))


def incident_prompt(incident):
    return (
        "The health monitor opened an incident. It does not chat and it did not change anything. "
        f"Incident {incident.get('id')}. Signal: {incident.get('signal')}. "
        f"Health report: {incident.get('report') or 'unknown'}. "
        "Look at the host and the service this signal points at. Use a saved skill when one matches this signal. "
        "Restart or resize only the service that is down or out of memory. "
        "Then say what you found and what you did."
    )
