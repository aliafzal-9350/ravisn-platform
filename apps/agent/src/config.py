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
    INBOUND_AI_STREAM_KEY: str = "inbound_ai_jobs"
    CRM_BROADCAST_CHANNEL: str = "crm_channel_updates"
    AGENT_WORKER_CONCURRENCY: int = 8

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
    JWT_SECRET: str = "ravisn-secret-jwt-key"
    CORS_ORIGINS: str = "*"


settings = Settings()
