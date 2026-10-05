import json
import logging
import re
from pathlib import Path
import httpx
from src.graph.state import AgentState
from src.config import settings

logger = logging.getLogger(__name__)

# Loaded from the shared cross-app keyword source (see
# shared/escalation-keywords.json and scripts/sync-escalation-keywords.sh) so
# this stays in lockstep with apps/core's AiIntelligenceEngine instead of
# drifting into a separately-maintained word list.
_KEYWORDS_PATH = Path(__file__).resolve().parents[2] / "data" / "escalation-keywords.json"


def _compile_patterns(fragments: list[str]) -> list[re.Pattern]:
    return [re.compile(r"\b(" + fragment + r")\b", re.IGNORECASE) for fragment in fragments]


def _load_human_trigger_patterns() -> list[re.Pattern]:
    try:
        with open(_KEYWORDS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return _compile_patterns(
            data.get("human_request_patterns", []) + data.get("frustration_patterns", [])
        )
    except Exception as e:
        logger.error(f"[RouterNode] Failed to load shared escalation keywords from {_KEYWORDS_PATH}: {e}")
        return []


HUMAN_TRIGGER_PATTERNS = _load_human_trigger_patterns()

VALID_INTENTS = ['faq', 'support', 'sales', 'human_escalation', 'general_inquiry']


async def router_node(state: AgentState) -> AgentState:
    """Classifies user intent and customer sentiment using priority cascade (Groq -> Gemini -> OpenAI)."""
    text = (state.get("raw_content") or "").lower().strip()

    # 1. Direct Human Escalation & Sentiment Pattern Matching
    if any(pattern.search(text) for pattern in HUMAN_TRIGGER_PATTERNS):
        logger.info(f"[RouterNode] Human escalation / high frustration detected in message: '{text}'")
        state["intent"] = "human_escalation"
        return state

    if not text:
        state["intent"] = "general_inquiry"
        return state

    prompt = (
        "You are an intent and customer sentiment classifier for an enterprise omni-channel customer service platform.\n"
        "Classify the customer message into EXACTLY ONE of these categories:\n"
        "- human_escalation: Customer is angry, furious, frustrated, complaining severely, or demanding a human.\n"
        "- sales: Customer is interested in purchasing, pricing, consultation, demo, or hiring services.\n"
        "- support: Customer has a technical question, issue, or needs troubleshooting.\n"
        "- faq: Customer is asking a general business question (hours, policies, company information).\n"
        "- general_inquiry: General greeting, chit-chat, or unclassified message.\n\n"
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
                return state
        except Exception as e:
            logger.debug(f"[RouterNode] Groq classification fallback: {e}")

    # 3. Try Gemini
    if settings.GEMINI_API_KEY:
        try:
            # The key travels in a header, never in the URL: request URLs are logged.
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_CHAT_MODEL}:generateContent"
            payload = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.0, "maxOutputTokens": 10}
            }
            async with httpx.AsyncClient(timeout=5.0) as http_client:
                resp = await http_client.post(url, json=payload, headers={"x-goog-api-key": settings.GEMINI_API_KEY})
                if resp.status_code == 200:
                    candidates = resp.json().get("candidates", [])
                    if candidates:
                        detected = candidates[0]["content"]["parts"][0]["text"].strip().lower()
                        if detected in VALID_INTENTS:
                            state["intent"] = detected
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
                return state
        except Exception as e:
            logger.debug(f"[RouterNode] OpenAI classification fallback: {e}")

    state["intent"] = "general_inquiry"
    return state
