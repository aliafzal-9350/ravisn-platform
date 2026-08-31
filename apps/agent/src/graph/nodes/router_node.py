import logging
from src.graph.state import AgentState
from src.config import settings

logger = logging.getLogger(__name__)

HUMAN_TRIGGERS = [
    "human", "agent", "operator", "talk to a person", "representative",
    "call me", "insan se baat", "bande se baat", "manager", "support agent",
    "complaint", "escalate"
]


async def router_node(state: AgentState) -> AgentState:
    """Classifies user intent (Sales, FAQ, Support, Human Escalation, General)."""
    text = (state.get("raw_content") or "").lower().strip()

    # 1. Direct Human Escalation Pattern Matching
    if any(trigger in text for trigger in HUMAN_TRIGGERS):
        logger.info(f"[RouterNode] Human escalation detected in message: '{text}'")
        state["intent"] = "human_escalation"
        state["telemetry"]["confidence_score"] = 0.99
        return state

    # 2. LLM Intent Classification if OpenAI/Groq is configured
    if settings.OPENAI_API_KEY and len(text) > 0:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            prompt = (
                "You are an intent classifier for an enterprise omni-channel customer service platform.\n"
                "Classify the following customer message into EXACTLY ONE of these categories: "
                "['faq', 'support', 'sales', 'human_escalation', 'general_inquiry'].\n"
                f"Customer Message: \"{text}\"\n"
                "Output ONLY the category name."
            )

            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.0
            )
            detected = resp.choices[0].message.content.strip().lower()
            if detected in ['faq', 'support', 'sales', 'human_escalation', 'general_inquiry']:
                state["intent"] = detected
                state["telemetry"]["confidence_score"] = 0.95
                return state
        except Exception as e:
            logger.warning(f"[RouterNode] LLM intent classification failed: {e}. Defaulting to general_inquiry.")

    state["intent"] = "general_inquiry"
    state["telemetry"]["confidence_score"] = 0.80
    return state
