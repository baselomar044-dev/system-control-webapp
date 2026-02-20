import time
from typing import Any, Optional

from config import AGENT_MAX_ITERATIONS, OPENAI_API_KEY, OPENAI_MODEL
from agent.tools import ALL_TOOLS

_SAFETY_BLOCKED = {
    "format", "mkfs", "dd if=/dev/zero", "rm -rf /",
    "shutdown", "reboot", ":(){:|:&};:",
}


def _is_safe_request(message: str) -> bool:
    lower = message.lower()
    for blocked in _SAFETY_BLOCKED:
        if blocked in lower:
            return False
    return True


def _build_agent():
    if not OPENAI_API_KEY:
        return None
    try:
        from langchain_openai import ChatOpenAI
        from langchain.agents import AgentExecutor, create_openai_tools_agent
        from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
        from langchain.memory import ConversationBufferWindowMemory

        llm = ChatOpenAI(
            model=OPENAI_MODEL,
            api_key=OPENAI_API_KEY,
            temperature=0,
        )
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are an intelligent system control assistant. You can monitor and control "
                "the computer using the provided tools. Always be safe and confirm before "
                "performing destructive operations. Provide clear, concise responses.",
            ),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        agent = create_openai_tools_agent(llm, ALL_TOOLS, prompt)
        memory = ConversationBufferWindowMemory(
            memory_key="chat_history", return_messages=True, k=20
        )
        executor = AgentExecutor(
            agent=agent,
            tools=ALL_TOOLS,
            memory=memory,
            max_iterations=AGENT_MAX_ITERATIONS,
            handle_parsing_errors=True,
            verbose=False,
        )
        return executor
    except Exception as e:
        print(f"[Agent] Failed to build LangChain agent: {e}")
        return None


_agent_executor = None


def _get_agent():
    global _agent_executor
    if _agent_executor is None:
        _agent_executor = _build_agent()
    return _agent_executor


def _fallback_response(message: str) -> dict[str, Any]:
    from agent.tools import get_system_summary
    lower = message.lower()
    if any(w in lower for w in ("cpu", "memory", "ram", "disk", "status", "summary", "system")):
        summary = get_system_summary.invoke({})
        return {
            "response": f"Here is the current system status:\n\n{summary}",
            "used_fallback": True,
            "tool_calls": ["get_system_summary"],
        }
    return {
        "response": (
            "I'm running in offline mode (no OpenAI API key configured). "
            "I can answer basic system queries. Try asking about CPU, memory, disk, or processes."
        ),
        "used_fallback": True,
        "tool_calls": [],
    }


def chat(message: str, session_id: str = "default") -> dict[str, Any]:
    start = time.time()

    if not _is_safe_request(message):
        return {
            "response": "This request was blocked for safety reasons.",
            "blocked": True,
            "duration": 0,
        }

    agent = _get_agent()
    if agent is None:
        result = _fallback_response(message)
        result["duration"] = round(time.time() - start, 3)
        return result

    try:
        output = agent.invoke({"input": message})
        return {
            "response": output.get("output", "No response generated."),
            "blocked": False,
            "used_fallback": False,
            "duration": round(time.time() - start, 3),
        }
    except Exception as e:
        return {
            "response": f"Agent error: {str(e)}",
            "blocked": False,
            "used_fallback": False,
            "error": str(e),
            "duration": round(time.time() - start, 3),
        }


def reset_memory() -> dict[str, Any]:
    global _agent_executor
    _agent_executor = None
    return {"reset": True}
