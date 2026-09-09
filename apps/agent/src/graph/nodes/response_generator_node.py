import logging
from typing import Optional
from src.graph.state import AgentState
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


async def response_generator_node(state: AgentState) -> AgentState:
    """Generates channel-optimized AI outputs with full multi-provider priority cascade."""
    # If guardrail already set a response, format and return
    if state.get("final_response"):
        state["final_response"] = format_channel_response(state["final_response"], state.get("channel", "whatsapp"))
        return state

    user_query = state.get("raw_content") or ""
    channel = state.get("channel", "whatsapp")
    rag_context = state.get("rag_context", "")

    # Channel formatting instructions
    channel_instruction = ""
    if channel == "whatsapp":
        channel_instruction = "Use WhatsApp formatting (*bold*, _italic_, bullet points). Keep messages clear, concise, and structured."
    elif channel == "instagram":
        channel_instruction = "Keep responses concise under 1000 characters suitable for Instagram Direct Message."
    else:
        channel_instruction = "Provide a professional, friendly, and structured customer response."

    system_prompt = (
        "You are an enterprise AI customer service assistant for RAVISN Platform.\n"
        f"Channel: {channel.upper()}.\n"
        f"Formatting Guidelines: {channel_instruction}\n"
        "Always be polite, helpful, and professional. Support English and Roman Urdu naturally if requested."
    )

    if rag_context:
        system_prompt += f"\n\nUse the following verified knowledge base context to answer:\n{rag_context}"

    # Generate response via priority cascade
    result = await LLMFactory.generate_response(
        system_prompt=system_prompt,
        user_query=user_query,
        temperature=0.3
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
