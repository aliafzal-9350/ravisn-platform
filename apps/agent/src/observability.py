"""Error tracking (Sentry). Off unless SENTRY_DSN is set.

Customer conversations are private, so no request bodies or personal data are
ever sent: only the error, its stack trace and which component raised it.
"""
import logging

from src.config import settings

logger = logging.getLogger(__name__)


def init_error_tracking(component: str) -> bool:
    """Start Sentry for this process; returns whether it is active."""
    if not settings.SENTRY_DSN:
        return False

    try:
        import sentry_sdk
    except ImportError:
        logger.warning("[Observability] SENTRY_DSN is set but sentry-sdk is not installed; rebuild the agent image.")
        return False

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        send_default_pii=False,
        max_request_body_size="never",
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
    )
    sentry_sdk.set_tag("component", component)
    logger.info(f"[Observability] Sentry error tracking active for {component}")
    return True
