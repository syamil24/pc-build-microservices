"""One narrow bash tool plus read-only file access. The model still does not
get a free-form shell: read-only commands always run, and a command that
changes the machine runs only when the user's own message asked to run one."""

import os
import subprocess
from pathlib import Path

from .actions import USER_MESSAGE, root_dir
from .guard import command_allowed

COMMAND_TIMEOUT = 120
OUTPUT_LIMIT = 3000
FILE_LIMIT = 20000


def run_command(command: str) -> str:
    """Run one bash command line in the repository root and return its exit code and combined output.
    Use it to inspect anything the other tools cannot see: git, ports, files, processes, disk details.
    Read-only commands always run. A command that changes the machine, installs software, or rewrites
    git history is refused unless the user's own message asked to run it. Piping a download into a
    shell is always refused."""
    line = (command or "").strip()
    if not line:
        return "No command was given."
    if "\n" in line:
        return "Give me one command line. Chain with && or ; instead of newlines."
    if not command_allowed(USER_MESSAGE.get(), line):
        return (
            "Refusing that command. Read-only commands are fine; "
            "ask me in your own message to run a change command like that."
        )
    try:
        result = subprocess.run(
            ["bash", "-c", line],
            cwd=root_dir(),
            text=True,
            capture_output=True,
            timeout=COMMAND_TIMEOUT,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return f"Timed out after {COMMAND_TIMEOUT} seconds."
    output = ((result.stdout or "") + (result.stderr or "")).strip()
    return f"exit {result.returncode}\n{output[-OUTPUT_LIMIT:]}" if output else f"exit {result.returncode}"


def read_file(path: str) -> str:
    """Read one text file inside the repository: code, config, json, or md. Use it when a question is
    about a file's exact content and the answer has to quote it."""
    root = root_dir().resolve()
    raw = (path or "").strip()
    if not raw:
        return "No path was given."
    target = Path(raw).resolve() if os.path.isabs(raw) else (root / raw).resolve()
    if root != target and root not in target.parents:
        return "That path is outside the repository."
    if not target.is_file():
        return "That is not a file in the repository."
    try:
        text = target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return str(exc)
    if len(text) > FILE_LIMIT:
        return text[:FILE_LIMIT] + f"\n... truncated, {len(text) - FILE_LIMIT} more characters"
    return text
