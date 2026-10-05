import logging
from datetime import date
from typing import Any, Dict, Optional
from src.graph.state import AgentState
from src.services.conversation_history import load_history
from src.services.llm_factory import LLMFactory

logger = logging.getLogger(__name__)


def format_channel_response(text: str, channel: str) -> str:
    """Format and constrain AI responses based on target messaging channel constraints."""
    if not text:
        return ""

    channel = (channel or "whatsapp").lower()

    if channel == "instagram":
        # Strict 1000-character limit for Instagram Graph API
        if len(text) > 1000:
            return text[:996] + "..."
        return text

    elif channel == "whatsapp":
        # Keep clean WhatsApp markdown syntax
        return text.strip()

    elif channel == "messenger":
        # Messenger limit is 2000 characters
        if len(text) > 2000:
            return text[:1996] + "..."
        return text.strip()

    return text.strip()


TONE_INSTRUCTIONS = {
    "professional_consultative": "Adopt a professional, consultative tone.",
    "persuasive_confident": "Adopt a confident, persuasive tone focused on moving the customer forward.",
    "empathetic_direct": "Adopt an empathetic but direct tone; acknowledge the issue, then give clear steps.",
    "friendly_efficient": "Adopt a friendly, efficient tone; be warm and keep replies short.",
}

DEFAULT_PERSONA = "You are an enterprise AI customer service assistant for RAVISN Platform."


def _fill_variables(text: str, channel: str, ai_config: Dict[str, Any]) -> str:
    """Substitute the {{variables}} advertised on the Prompt Tuning page."""
    replacements = {
        "{{contact_name}}": str(ai_config.get("contact_name") or "the customer"),
        "{{company_name}}": str(ai_config.get("company_name") or "our company"),
        "{{channel}}": channel.capitalize(),
        "{{current_date}}": date.today().isoformat(),
    }
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text


def build_system_prompt(channel: str, rag_context: str, ai_config: Optional[Dict[str, Any]] = None) -> str:
    """Compose the system prompt, honouring the tenant's Prompt Tuning settings.

    The tenant's prompt replaces the default persona only; channel formatting,
    prohibited topics and the knowledge-base grounding are always applied.
    """
    ai_config = ai_config or {}
    channel = (channel or "whatsapp").lower()

    if channel == "whatsapp":
        channel_instruction = "Use WhatsApp formatting (*bold*, _italic_, bullet points). Keep messages clear, concise, and structured."
    elif channel == "instagram":
        channel_instruction = "Keep responses concise under 1000 characters suitable for Instagram Direct Message."
    else:
        channel_instruction = "Provide a professional, friendly, and structured customer response."

    persona = (ai_config.get("system_prompt") or "").strip() or DEFAULT_PERSONA
    parts = [
        _fill_variables(persona, channel, ai_config),
        f"Channel: {channel.upper()}.",
        f"Formatting Guidelines: {channel_instruction}",
        "Always be polite, helpful, and professional. Support English and Roman Urdu naturally if requested.",
    ]

    tone = TONE_INSTRUCTIONS.get(ai_config.get("ai_tone") or "")
    if tone:
        parts.append(tone)

    prohibited = (ai_config.get("prohibited_topics") or "").strip()
    if prohibited:
        parts.append(f"Never discuss or speculate about: {prohibited}. Politely decline and steer back to how you can help.")

    prompt = "\n".join(parts)

    if rag_context:
        prompt += f"\n\nUse the following verified knowledge base context to answer:\n{rag_context}"

    return prompt


def _temperature(ai_config: Optional[Dict[str, Any]]) -> float:
    try:
        value = float((ai_config or {}).get("temperature", 0.3))
    except (TypeError, ValueError):
        return 0.3
    return min(max(value, 0.0), 1.0)


async def response_generator_node(state: AgentState) -> AgentState:
    """Generates channel-optimized AI outputs with full multi-provider priority cascade."""
    # If guardrail already set a response, format and return
    if state.get("final_response"):
        state["final_response"] = format_channel_response(state["final_response"], state.get("channel", "whatsapp"))
        return state

    user_query = state.get("raw_content") or ""
    channel = state.get("channel", "whatsapp")
    rag_context = state.get("rag_context", "")

    ai_config = state.get("ai_config") or {}
    system_prompt = build_system_prompt(channel, rag_context, ai_config)

    # Earlier turns, so follow-ups ("and for two people?") are understood.
    history = await load_history(state.get("thread_id"), state.get("message_id"))
    state["telemetry"]["history_turns"] = len(history)

    # Generate response via priority cascade
    result = await LLMFactory.generate_response(
        system_prompt=system_prompt,
        user_query=user_query,
        temperature=_temperature(ai_config),
        history=history,
    )

    formatted_content = format_channel_response(result["content"], channel)

    state["final_response"] = formatted_content
    state["decision"] = "reply"
    state["telemetry"]["model"] = result["model"]
    state["telemetry"]["prompt_tokens"] = result["prompt_tokens"]
    state["telemetry"]["completion_tokens"] = result["completion_tokens"]
    state["telemetry"]["latency_ms"] = result["latency_ms"]
    state["telemetry"]["confidence_score"] = result["confidence_score"]

    logger.info(f"[ResponseGeneratorNode] Final response generated via {result['model']} ({result['latency_ms']}ms)")
    return state
