import uuid
import pytest

from src.workers import redis_consumer


class _FakeSession:
    def __init__(self, value=None, error=None):
        self._value = value
        self._error = error

    async def scalar(self, _statement):
        if self._error:
            raise self._error
        return self._value

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False


def _factory(value=None, error=None):
    return lambda: _FakeSession(value=value, error=error)


@pytest.mark.asyncio
async def test_bot_is_inactive_when_a_human_has_taken_over(monkeypatch):
    monkeypatch.setattr(redis_consumer, "async_session_factory", _factory(value=False))

    assert await redis_consumer._bot_is_active(str(uuid.uuid4())) is False


@pytest.mark.asyncio
async def test_bot_is_active_when_the_thread_allows_autonomous_replies(monkeypatch):
    monkeypatch.setattr(redis_consumer, "async_session_factory", _factory(value=True))

    assert await redis_consumer._bot_is_active(str(uuid.uuid4())) is True


@pytest.mark.asyncio
async def test_unknown_thread_defaults_to_active(monkeypatch):
    monkeypatch.setattr(redis_consumer, "async_session_factory", _factory(value=None))

    assert await redis_consumer._bot_is_active(str(uuid.uuid4())) is True


@pytest.mark.asyncio
async def test_a_failing_recheck_never_blocks_a_reply(monkeypatch):
    monkeypatch.setattr(
        redis_consumer, "async_session_factory", _factory(error=RuntimeError("db down"))
    )

    assert await redis_consumer._bot_is_active(str(uuid.uuid4())) is True
