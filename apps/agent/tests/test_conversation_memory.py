"""The AI sees the conversation so far, not just the newest message."""
import uuid
from types import SimpleNamespace

from src.graph.nodes import response_generator_node as generator
from src.services import conversation_history
from src.services.conversation_history import load_history
from src.services.llm_factory import LLMFactory


def test_chat_messages_put_history_between_instructions_and_the_new_message():
    history = [{"role": "user", "content": "Do you open on Sunday?"}, {"role": "assistant", "content": "Yes, 10 to 4."}]

    messages = LLMFactory.chat_messages("Be helpful.", "And on Monday?", history)

    assert [m["role"] for m in messages] == ["system", "user", "assistant", "user"]
    assert messages[-1]["content"] == "And on Monday?"


def test_gemini_contents_use_model_role_for_replies():
    contents = LLMFactory.gemini_contents("Be helpful.", "And on Monday?", [
        {"role": "user", "content": "Do you open on Sunday?"},
        {"role": "assistant", "content": "Yes."},
    ])

    assert [c["role"] for c in contents] == ["user", "model", "user"]
    assert "And on Monday?" in contents[-1]["parts"][0]["text"]


class _Rows:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _Session:
    """Returns canned rows newest first, as the real query orders them."""

    def __init__(self, rows):
        self.rows = rows

    async def execute(self, _statement):
        return _Rows(self.rows)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False


def row(direction, content, message_type="text", raw_payload=None, id_=None):
    return SimpleNamespace(id=id_ or uuid.uuid4(), direction=direction, message_type=message_type,
                           content=content, raw_payload=raw_payload or {})


async def test_history_is_oldest_first_and_skips_notes_system_and_current(monkeypatch):
    current = uuid.uuid4()
    newest_first = [
        row("inbound", "And for two people?", id_=current),
        row("outbound", "Agent note: VIP client", message_type="note"),
        row("outbound", "Customer opted out", raw_payload={"system": True}),
        row("outbound", "A table for one is 20 USD."),
        row("inbound", None, message_type="audio"),
        row("inbound", "How much is a table?"),
    ]
    monkeypatch.setattr(conversation_history, "async_session_factory", lambda: _Session(newest_first))

    history = await load_history(str(uuid.uuid4()), exclude_message_id=str(current))

    assert history == [
        {"role": "user", "content": "How much is a table?"},
        {"role": "user", "content": "[sent a voice note]"},
        {"role": "assistant", "content": "A table for one is 20 USD."},
    ]


async def test_history_is_empty_for_threads_that_do_not_exist_yet():
    assert await load_history("not-a-uuid") == []


async def test_the_response_generator_gives_the_model_the_conversation(monkeypatch):
    captured = {}
    earlier = [{"role": "user", "content": "How much is a table?"}, {"role": "assistant", "content": "20 USD."}]

    async def fake_history(thread_id, message_id):
        captured["lookup"] = (thread_id, message_id)
        return earlier

    async def fake_llm(**kwargs):
        captured["llm"] = kwargs
        return {"content": "40 USD for two.", "model": "test", "prompt_tokens": 1, "completion_tokens": 1,
                "latency_ms": 1, "confidence_score": None}

    monkeypatch.setattr(generator, "load_history", fake_history)
    monkeypatch.setattr(generator.LLMFactory, "generate_response", fake_llm)

    state = {"thread_id": "t-1", "message_id": "m-9", "raw_content": "And for two people?", "channel": "whatsapp",
             "rag_context": "", "ai_config": {}, "telemetry": {}, "final_response": ""}
    result = await generator.response_generator_node(state)

    assert captured["lookup"] == ("t-1", "m-9")
    assert captured["llm"]["history"] == earlier
    assert captured["llm"]["user_query"] == "And for two people?"
    assert result["telemetry"]["history_turns"] == 2
    assert result["telemetry"]["confidence_score"] is None
