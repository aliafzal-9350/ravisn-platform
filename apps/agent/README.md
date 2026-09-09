# RAVISN Multi-Agent AI Engine (`apps/agent`)

Sanitized, High-Throughput Autonomous Multi-Agent Intelligence Engine built with **FastAPI**, **LangGraph StateGraph**, **pgvector RAG**, **Groq Whisper Voice Processing**, and **Official Meta Graph API v21.0**.

---

## Key Capabilities

1. **LangGraph State Machine**:
   - `audio_transcriber_node`: Downloads voice notes directly from Meta CDN and performs fast Whisper transcription via Groq or OpenAI.
   - `router_node`: Real-time intent classification with human escalation detection and multi-provider cascade.
   - `rag_retriever_node`: Semantic search using pgvector cosine distance over PostgreSQL `knowledge_chunks` HNSW index.
   - `guardrail_node`: Prompt injection filtering and safety validation.
   - `response_generator_node`: Multi-AI provider priority cascade (Groq Llama-3.3-70B -> Gemini 2.5 Flash -> xAI Grok 3 Mini -> OpenAI GPT-4o Mini).
   - `human_handoff_node`: Automated human takeover escalation with Redis Pub/Sub CRM notification.

2. **Official Meta Graph API**:
   - Strictly standardizes on Meta Graph API `/v21.0/{phone_number_id}/messages`.
   - Zero unofficial scrapers, zero Baileys, zero QR web wrappers.

3. **Database & Migrations**:
   - Schema is owned strictly by Laravel migrations in `apps/core/database/migrations`.
   - SQLAlchemy 2.0 async models in `src/db/models.py` align directly with PostgreSQL 16 + pgvector.

4. **Redis Queue & Workers**:
   - Inbound AI jobs consumed asynchronously from Redis `inbound_ai_jobs`.
   - Live CRM updates broadcast to Redis Pub/Sub `crm_channel_updates`.
