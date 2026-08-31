from typing import TypedDict, Optional, List, Dict, Any


class AgentState(TypedDict):
    thread_id: str
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
