import time
import logging
from src.graph.state import AgentState
from src.config import settings

logger = logging.getLogger(__name__)


async def response_generator_node(state: AgentState) -> AgentState:
    """Generates channel-optimized AI outputs with full token and latency telemetry."""
    # If guardrail already set a response, keep it
    if state.get("final_response"):
        return state

    start_time = time.time()
    user_query = state.get("raw_content") or ""
    channel = state.get("channel", "whatsapp")
    rag_context = state.get("rag_context", "")
    intent = state.get("intent", "general_inquiry")

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

    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            model_name = settings.OPENAI_CHAT_MODEL

            resp = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ],
                temperature=0.4,
                max_tokens=600
            )

            latency_ms = int((time.time() - start_time) * 1000)
            answer = resp.choices[0].message.content.strip()

            state["final_response"] = answer
            state["decision"] = "reply"
            state["telemetry"]["model"] = model_name
            state["telemetry"]["prompt_tokens"] = resp.usage.prompt_tokens if resp.usage else 0
            state["telemetry"]["completion_tokens"] = resp.usage.completion_tokens if resp.usage else 0
            state["telemetry"]["latency_ms"] = latency_ms

            logger.info(f"[ResponseGeneratorNode] Generated response ({latency_ms}ms, {resp.usage.completion_tokens if resp.usage else 0} tokens)")
            return state
        except Exception as e:
            logger.error(f"[ResponseGeneratorNode] OpenAI Generation failed: {e}")

    # Fallback response
    latency_ms = int((time.time() - start_time) * 1000)
    state["final_response"] = (
        "Thank you for contacting us! We have received your message and an agent will follow up with you shortly."
    )
    state["decision"] = "reply"
    state["telemetry"]["model"] = "fallback"
    state["telemetry"]["prompt_tokens"] = 0
    state["telemetry"]["completion_tokens"] = 0
    state["telemetry"]["latency_ms"] = latency_ms

    return state
