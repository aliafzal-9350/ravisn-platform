"""Error tracking is opt-in and never sends customer content."""
import pytest

from src import observability
from src.config import settings


def test_error_tracking_is_off_without_a_dsn(monkeypatch):
    monkeypatch.setattr(settings, "SENTRY_DSN", None)

    assert observability.init_error_tracking("agent-api") is False


def test_error_tracking_never_sends_personal_data_or_message_bodies(monkeypatch):
    sentry_sdk = pytest.importorskip("sentry_sdk")
    captured = {}

    monkeypatch.setattr(settings, "SENTRY_DSN", "https://public@example.ingest.sentry.io/1")
    monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: captured.update(kwargs))
    monkeypatch.setattr(sentry_sdk, "set_tag", lambda *_args: None)

    assert observability.init_error_tracking("agent-worker") is True
    assert captured["send_default_pii"] is False
    assert captured["max_request_body_size"] == "never"
