import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Ravisn Multi-Agent AI Platform"
    APP_ENV: str = "production"
    DEBUG: bool = False

    # Database URLs
    DATABASE_URL: str = "postgresql://ravisn_user:SecureProductionPassword123!@postgres:5432/ravisn_db"
    DATABASE_ASYNC_URL: str = "postgresql+asyncpg://ravisn_user:SecureProductionPassword123!@postgres:5432/ravisn_db"

    # Redis
    REDIS_URL: str = "redis://:SecureRedisPassword123!@redis:6379/0"
    # Legacy Redis LIST of AI jobs; drained into the stream below on startup and
    # while running, so jobs queued before an upgrade are not lost.
    INBOUND_AI_STREAM_KEY: str = "inbound_ai_jobs"
    # Redis STREAM of AI jobs, read through a consumer group so a job is only
    # removed once it has been handled (crash-safe), and retried otherwise.
    INBOUND_AI_STREAM: str = "ai:inbound"
    AI_WORKER_GROUP: str = "ai-workers"
    CRM_BROADCAST_CHANNEL: str = "crm_channel_updates"
    # How many AI jobs one worker process handles at the same time.
    AGENT_WORKER_CONCURRENCY: int = 8
    # A text message waits this long; if the customer sends more in the
    # meantime, one reply answers the whole burst.
    AI_DEBOUNCE_SECONDS: float = 3.0
    # Attempts before a failing job is moved to the dead-letter stream.
    AI_MAX_ATTEMPTS: int = 3
    # A job held this long by a crashed worker is taken over by another.
    AI_CLAIM_IDLE_MS: int = 300_000

    # Meta Graph API
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None
    META_WEBHOOK_VERIFY_TOKEN: Optional[str] = None
    META_API_VERSION: str = "v21.0"
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_BUSINESS_ACCOUNT_ID: Optional[str] = None
    WHATSAPP_SYSTEM_USER_ACCESS_TOKEN: Optional[str] = None

    # AI Models & Multi-Provider Priority Cascade
    # 1. Primary: Groq
    GROQ_API_KEY: Optional[str] = None
    GROQ_CHAT_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_WHISPER_MODEL: str = "whisper-large-v3"

    # 2. Secondary: Google Gemini
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_CHAT_MODEL: str = "gemini-2.5-flash"

    # 3. Tertiary: xAI Grok
    XAI_API_KEY: Optional[str] = None
    XAI_CHAT_MODEL: str = "grok-3-mini"

    # 4. Quaternary: OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_EMBEDDING_DIMENSIONS: int = 1536

    # Security & CORS
    # Shared secret Laravel sends as X-Internal-Token on every agent API call.
    # Required in production; the API refuses to serve without it.
    INTERNAL_API_TOKEN: Optional[str] = None
    # Laravel's APP_KEY, used to decrypt channel access tokens stored with
    # Laravel's `encrypted` cast in the shared database.
    APP_KEY: Optional[str] = None
    # The agent is internal-only, so no browser origin is allowed by default.
    CORS_ORIGINS: str = ""

    # Error tracking (Sentry); leave empty to disable.
    SENTRY_DSN: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


settings = Settings()
