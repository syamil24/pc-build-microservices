"""LangGraph chat agent. The model only sees the four tools below."""

import os
import sqlite3

from langchain.agents import create_agent
from langchain.agents.middleware import AgentMiddleware, ModelRequest
from langgraph.checkpoint.sqlite import SqliteSaver

from .actions import USER_MESSAGE, emergency_fix, heal_dir, operate_service, root_dir
from .history import window
from .observe import observe_host, observe_service
from .shell import read_file, run_command

SYSTEM = """You are texting on Telegram as the person who watches this Apex Build VPS.
Reply in casual plain text, a few sentences. Money in this shop is integer cents.
Bounded contexts stay separate: do not invent a call from one service into another's database.
Call a tool before you state a live number. Do not claim a restart, a config change, or a pull request until the tool returns.
observe_host reads the machine. observe_service reads one shop service, and payment means the three payment jars.
operate_service restarts or changes only the named jars. emergency_fix edits Java and opens a heal pull request, and only when the user asked for a code change, a pull request, or an emergency.
run_command runs one bash line in the repository root for anything the named tools cannot see: git, ports, files, processes. It refuses a command that changes the machine unless the user's own message asked to run it, and it never pipes a download into a shell.
read_file reads one repository file when a question needs its exact content.
Answer questions outside this shop from your own knowledge when no live number is involved, and say it is your own reading when the shop has no data for it. If a tool cannot see it, say you cannot see it from here.
"""


def observe_host_tool() -> str:
    """Read CPU, load, RAM, disk, and the CPU and RSS of each Java process. This is not a shell."""
    return observe_host(root_dir())


def observe_service_tool(name: str) -> str:
    """Read health, JVM heap, process RSS, and the last errors for a shop service. `payment` checks all three payment jars."""
    return observe_service(root_dir(), heal_dir(), name)


class TrimHistory(AgentMiddleware):
    """Keep the system text plus a repaired latest 40 messages on each model
    call. The repair drops turns a provider rejects: an orphan tool result, a
    tool call with no result, and anything before the first user turn."""

    def _trimmed(self, request: ModelRequest) -> ModelRequest:
        messages = window(request.messages, 40)
        if messages == request.messages:
            return request
        return request.override(messages=messages)

    def wrap_model_call(self, request: ModelRequest, handler):
        return handler(self._trimmed(request))

    async def awrap_model_call(self, request: ModelRequest, handler):
        return await handler(self._trimmed(request))


def build_agent():
    model = os.environ.get("CHAT_MODEL")
    if not model:
        raise RuntimeError("CHAT_MODEL is not set. Example: openai:gpt-4.1-mini")
    directory = heal_dir()
    directory.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(directory / "chat-checkpoints.sqlite", check_same_thread=False)
    checkpointer = SqliteSaver(connection)
    if hasattr(checkpointer, "setup"):
        checkpointer.setup()
    agent = create_agent(
        model,
        [observe_host_tool, observe_service_tool, operate_service, emergency_fix, run_command, read_file],
        system_prompt=SYSTEM,
        checkpointer=checkpointer,
        middleware=[TrimHistory()],
    )
    agent._apex_sqlite = connection
    return agent


def reply_text(result):
    message = result["messages"][-1]
    content = message.content if hasattr(message, "content") else message["content"]
    if isinstance(content, str):
        return content.strip()
    parts = []
    for block in content:
        if isinstance(block, str):
            parts.append(block)
        elif isinstance(block, dict):
            parts.append(block.get("text") or "")
        elif hasattr(block, "text"):
            parts.append(block.text or "")
    return "".join(parts).strip()


def answer(agent, chat_id, text):
    token = USER_MESSAGE.set(text)
    try:
        result = agent.invoke(
            {"messages": [{"role": "user", "content": text}]},
            {"configurable": {"thread_id": str(chat_id)}},
        )
    finally:
        USER_MESSAGE.reset(token)
    return reply_text(result) or "I looked, and I don't have a reply."
