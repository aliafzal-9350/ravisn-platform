from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from src.graph.graph import compiled_agent_graph

router = APIRouter(prefix="/agent", tags=["AI Agent"])


class DirectAgentRequest(BaseModel):
    thread_id: str
    contact_id: str
    channel: str = "whatsapp"
    channel_identity_id: Optional[str] = None
    sender_id: str
    message_type: str = "text"
    content: Optional[str] = None
    media_id: Optional[str] = None
    access_token: Optional[str] = ""


class CopilotRequest(BaseModel):
    thread_id: str
    conversation_history: List[Dict[str, str]]
    latest_message: str


@router.post("/execute")
async def execute_agent_pipeline(request: DirectAgentRequest) -> Dict[str, Any]:
    """Synchronous test endpoint to run the full LangGraph state machine directly."""
    initial_state = {
        "thread_id": request.thread_id,
        "contact_id": request.contact_id,
        "channel": request.channel,
        "channel_identity_id": request.channel_identity_id or "",
        "sender_id": request.sender_id,
        "message_type": request.message_type,
        "raw_content": request.content,
        "media_id": request.media_id,
        "access_token": request.access_token or "",
        "messages": [],
        "rag_context": "",
        "intent": "",
        "final_response": "",
        "decision": "reply",
        "telemetry": {}
    }

    final_state = await compiled_agent_graph.ainvoke(initial_state)
    return {
        "intent": final_state.get("intent"),
        "decision": final_state.get("decision"),
        "final_response": final_state.get("final_response"),
        "rag_context": final_state.get("rag_context"),
        "telemetry": final_state.get("telemetry")
    }


@router.post("/copilot/suggest")
async def copilot_suggest(request: CopilotRequest) -> Dict[str, Any]:
    """Generates suggested replies for human CRM agents."""
    from src.config import settings

    if not settings.OPENAI_API_KEY:
        return {
            "suggested_replies": [
                "Hello! How can I assist you today?",
                "Thank you for contacting us. Let me check that for you."
            ]
        }

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        history_prompt = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in request.conversation_history[-5:]])
        prompt = (
            "You are an AI Copilot aiding a customer service agent.\n"
            f"Recent Conversation:\n{history_prompt}\n"
            f"Latest Customer Message: \"{request.latest_message}\"\n"
            "Provide 2 distinct, professional, concise suggested replies for the human agent. "
            "Format as JSON with key 'suggestions' as an array of strings."
        )

        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.7
        )

        import json
        data = json.loads(resp.choices[0].message.content)
        return {"suggested_replies": data.get("suggestions", [])}
    except Exception as e:
        return {
            "suggested_replies": [
                "Thank you for reaching out! How can I assist you today?"
            ],
            "error": str(e)
        }
