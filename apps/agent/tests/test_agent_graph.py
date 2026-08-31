import pytest
from src.graph.graph import compiled_agent_graph


@pytest.mark.asyncio
async def test_langgraph_general_inquiry_flow():
    initial_state = {
        "thread_id": "test-thread-123",
        "contact_id": "test-contact-123",
        "channel": "whatsapp",
        "channel_identity_id": "test-channel-123",
        "sender_id": "+1234567890",
        "message_type": "text",
        "raw_content": "What are your business hours?",
        "media_id": None,
        "mime_type": None,
        "access_token": "",
        "messages": [],
        "rag_context": "",
        "intent": "",
        "final_response": "",
        "decision": "reply",
        "telemetry": {}
    }

    final_state = await compiled_agent_graph.ainvoke(initial_state)

    assert final_state["intent"] in ["faq", "general_inquiry"]
    assert final_state["decision"] == "reply"
    assert len(final_state["final_response"]) > 0


@pytest.mark.asyncio
async def test_langgraph_human_escalation_branch():
    initial_state = {
        "thread_id": "test-thread-456",
        "contact_id": "test-contact-456",
        "channel": "whatsapp",
        "channel_identity_id": "test-channel-456",
        "sender_id": "+1234567890",
        "message_type": "text",
        "raw_content": "I want to talk to a human agent right now",
        "media_id": None,
        "mime_type": None,
        "access_token": "",
        "messages": [],
        "rag_context": "",
        "intent": "",
        "final_response": "",
        "decision": "reply",
        "telemetry": {}
    }

    final_state = await compiled_agent_graph.ainvoke(initial_state)

    assert final_state["intent"] == "human_escalation"
    assert final_state["decision"] == "handoff"
    assert "human" in final_state["final_response"].lower() or "agent" in final_state["final_response"].lower()
