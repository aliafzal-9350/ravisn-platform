import logging
import httpx
from src.graph.state import AgentState
from src.config import settings

logger = logging.getLogger(__name__)

HUMAN_TRIGGERS = [
    "human", "agent", "operator", "talk to a person", "representative",
    "call me", "insan se baat", "bande se baat", "manager", "support agent",
    "complaint", "escalate"
]

VALID_INTENTS = ['faq', 'support', 'sales', 'human_escalation', 'general_inquiry']


async def router_node(state: AgentState) -> AgentState:
    """Classifies user intent (Sales, FAQ, Support, Human Escalation, General) using priority cascade."""
    text = (state.get("raw_content") or "").lower().strip()

    # 1. Direct Human Escalation Pattern Matching
    if any(trigger in text for trigger in HUMAN_TRIGGERS):
        logger.info(f"[RouterNode] Human escalation detected in message: '{text}'")
        state["intent"] = "human_escalation"
        state["telemetry"]["confidence_score"] = 0.99
        return state

    if not text:
        state["intent"] = "general_inquiry"
        state["telemetry"]["confidence_score"] = 0.80
        return state

    prompt = (
        "You are an intent classifier for an enterprise omni-channel customer service platform.\n"
        "Classify the following customer message into EXACTLY ONE of these categories: "
        "['faq', 'support', 'sales', 'human_escalation', 'general_inquiry'].\n"
        f"Customer Message: \"{text}\"\n"
        "Output ONLY the single category name without punctuation or explanation."
    )

    # 2. Try Groq
    if settings.GROQ_API_KEY:
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            resp = await client.chat.completions.create(
                model=settings.GROQ_CHAT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.0
            )
            detected = resp.choices[0].message.content.strip().lower()
            if detected in VALID_INTENTS:
                state["intent"] = detected
                state["telemetry"]["confidence_score"] = 0.95
                return state
        except Exception as e:
            logger.debug(f"[RouterNode] Groq classification fallback: {e}")

    # 3. Try Gemini
    if settings.GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_CHAT_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.0, "maxOutputTokens": 10}
            }
            async with httpx.AsyncClient(timeout=5.0) as http_client:
                resp = await http_client.post(url, json=payload)
                if resp.status_code == 200:
                    candidates = resp.json().get("candidates", [])
                    if candidates:
                        detected = candidates[0]["content"]["parts"][0]["text"].strip().lower()
                        if detected in VALID_INTENTS:
                            state["intent"] = detected
                            state["telemetry"]["confidence_score"] = 0.95
                            return state
        except Exception as e:
            logger.debug(f"[RouterNode] Gemini classification fallback: {e}")

    # 4. Try OpenAI
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model=settings.OPENAI_CHAT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.0
            )
            detected = resp.choices[0].message.content.strip().lower()
            if detected in VALID_INTENTS:
                state["intent"] = detected
                state["telemetry"]["confidence_score"] = 0.95
                return state
        except Exception as e:
            logger.debug(f"[RouterNode] OpenAI classification fallback: {e}")

    state["intent"] = "general_inquiry"
    state["telemetry"]["confidence_score"] = 0.80
    return state
