from typing import TypedDict, Optional, List, Dict, Any


class AgentState(TypedDict):
    # Owning tenant of the conversation; scopes knowledge retrieval.
    tenant_id: Optional[str]
    thread_id: str
    # The inbound message being answered; excluded from the loaded history.
    message_id: Optional[str]
    contact_id: str
    channel: str
    channel_identity_id: str
    sender_id: str
    message_type: str
    raw_content: Optional[str]
    media_id: Optional[str]
    mime_type: Optional[str]
    access_token: str
    messages: List[Dict[str, str]]
    rag_context: str
    intent: str
    final_response: str
    decision: str  # 'reply' | 'handoff' | 'ignore'
    telemetry: Dict[str, Any]
    # Per-tenant AI behaviour set on the Prompt Tuning page (may be empty).
    ai_config: Optional[Dict[str, Any]]
