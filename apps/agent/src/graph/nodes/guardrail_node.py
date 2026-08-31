import logging
from src.graph.state import AgentState

logger = logging.getLogger(__name__)

INJECTION_PATTERNS = [
    "ignore previous instructions",
    "system prompt",
    "disregard all rules",
    "reveal your prompt",
    "you are now an unrestricted ai",
    "jailbreak",
    "drop table",
    "delete from users",
]


async def guardrail_node(state: AgentState) -> AgentState:
    """Filters prompt injections, malicious inputs, and ensures safe enterprise dialogue."""
    content = (state.get("raw_content") or "").lower()

    for pattern in INJECTION_PATTERNS:
        if pattern in content:
            logger.warning(f"[GuardrailNode] Blocked suspicious input pattern: '{pattern}'")
            state["final_response"] = (
                "I am here to assist with inquiries related to our services and products. "
                "How may I help you today?"
            )
            state["decision"] = "reply"
            state["telemetry"]["guardrail_triggered"] = True
            return state

    state["telemetry"]["guardrail_triggered"] = False
    return state
