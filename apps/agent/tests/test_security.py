"""Tenant isolation and internal-API security for the agent."""
import pytest
from httpx import AsyncClient, ASGITransport

from src.config import settings
from src.main import app
from src.services.hybrid_retriever import HybridRetrieverService
from src.services.laravel_crypt import DecryptionError, decrypt_or_none, decrypt_string

# Produced by Laravel's own Encrypter (aes-256-cbc) with key str_repeat("k", 32).
TEST_APP_KEY = "base64:a2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2s="
LARAVEL_PAYLOAD = (
    "eyJpdiI6IkN5UWRQZVNHQThFdUFlSUpoYUkrOWc9PSIsInZhbHVlIjoiOXg1ZHJXdTVOSTBuOHY3SmxKaEZsNDliSG5jTEQ2Zj"
    "M4ZXYwYitYL3VwTT0iLCJtYWMiOiJmYzg3N2IxNDIzZGFiMWJlNzkzMTUzOWU1ZGJjMjJlNzU2NjJiODFkZjBhYzhlYmJkYThh"
    "MzlmMjBmOTdjZjUxIiwidGFnIjoiIn0="
)


async def _post_embed(headers=None):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.post("/api/v1/knowledge/embed", json={"text": "hi"}, headers=headers or {})


@pytest.mark.asyncio
async def test_agent_api_rejects_calls_without_the_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_API_TOKEN", "s3cret")

    assert (await _post_embed()).status_code == 401
    assert (await _post_embed({"X-Internal-Token": "wrong"})).status_code == 401


@pytest.mark.asyncio
async def test_agent_api_accepts_the_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_API_TOKEN", "s3cret")

    async def fake_embedding(_text):
        return [0.0] * 1536

    monkeypatch.setattr(
        "src.api.v1.knowledge.EmbeddingService.generate_embedding", fake_embedding
    )

    response = await _post_embed({"X-Internal-Token": "s3cret"})
    assert response.status_code == 200
    assert response.json()["dimensions"] == 1536


@pytest.mark.asyncio
async def test_agent_api_fails_closed_in_production_without_a_token(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_API_TOKEN", None)
    monkeypatch.setattr(settings, "APP_ENV", "production")

    assert (await _post_embed()).status_code == 503


@pytest.mark.asyncio
async def test_health_probe_stays_open_for_container_checks(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_API_TOKEN", "s3cret")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health/")
    assert response.status_code == 200


class _RecordingSession:
    """Captures the statements the retriever runs, returning no rows."""

    def __init__(self):
        self.statements = []

    async def execute(self, statement, params=None):
        self.statements.append((str(statement), params or {}))

        class _Result:
            def all(self):
                return []

            def fetchall(self):
                return []

        return _Result()


@pytest.mark.asyncio
async def test_retrieval_without_a_tenant_returns_nothing():
    session = _RecordingSession()

    chunks = await HybridRetrieverService.hybrid_search(session=session, query="refund policy", tenant_id=None)

    assert chunks == []
    assert session.statements == [], "no knowledge may be queried without a tenant"


@pytest.mark.asyncio
async def test_retrieval_is_confined_to_the_tenant(monkeypatch):
    async def fake_embedding(_text):
        return [0.0] * 1536

    monkeypatch.setattr(
        "src.services.hybrid_retriever.EmbeddingService.generate_embedding", fake_embedding
    )
    session = _RecordingSession()

    await HybridRetrieverService.hybrid_search(session=session, query="refund policy", tenant_id="42")

    dense_sql, _ = session.statements[0]
    sparse_sql, sparse_params = session.statements[1]
    assert "knowledge_chunks.tenant_id" in dense_sql
    assert "tenant_id = :tenant_id" in sparse_sql
    assert sparse_params["tenant_id"] == "42"


def test_decrypts_a_laravel_encrypted_token():
    assert decrypt_string(LARAVEL_PAYLOAD, TEST_APP_KEY) == "EAAG-fixture-token"


def test_a_tampered_or_foreign_payload_is_rejected():
    tampered = LARAVEL_PAYLOAD[:-8] + "AAAAAAA="

    with pytest.raises(DecryptionError):
        decrypt_string(tampered, TEST_APP_KEY)

    wrong_key = "base64:" + "b" * 43 + "="
    assert decrypt_or_none(LARAVEL_PAYLOAD, wrong_key) is None
    assert decrypt_or_none("EAAG-plaintext", TEST_APP_KEY) is None
