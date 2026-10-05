"""API keys must never appear in request URLs: URLs are written to logs."""
import httpx

from src.config import settings
from src.services.llm_factory import LLMFactory


class _Response:
    status_code = 200

    def json(self):
        return {"candidates": [{"content": {"parts": [{"text": "Hello!"}]}}], "usageMetadata": {}}


async def test_gemini_key_is_sent_in_a_header_not_the_url(monkeypatch):
    sent = {}

    async def fake_post(self, url, json=None, headers=None, **_kwargs):
        sent["url"] = str(url)
        sent["headers"] = headers or {}
        return _Response()

    monkeypatch.setattr(settings, "GROQ_API_KEY", None)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "secret-gemini-key")
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    result = await LLMFactory.generate_response(system_prompt="Be helpful.", user_query="Hi")

    assert result["content"] == "Hello!"
    assert "secret-gemini-key" not in sent["url"]
    assert sent["headers"]["x-goog-api-key"] == "secret-gemini-key"
