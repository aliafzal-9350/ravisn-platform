# AGENTS.md — RAVISN Omnichannel Autonomous Platform

Guidelines and operational rules for AI coding assistants working within the `ravisn-platform` codebase.

---

## 1. Project Overview & Topology

RAVISN is an enterprise-grade omnichannel autonomous AI agent and outreach CRM platform composed of:
- **`apps/core` (Laravel 11 / PHP 8.3 / Inertia React 19):** Webhook gateway, database migrations, contact CRM, broadcast campaigns, real-time Reverb websockets, and human agent takeover.
- **`apps/agent` (FastAPI / Python 3.11 / LangGraph):** Autonomous AI reasoning engine, hybrid pgvector RAG, Whisper ASR audio processing, multi-AI cascading fallback (Groq $\rightarrow$ Gemini $\rightarrow$ xAI $\rightarrow$ OpenAI), and rule-based lead scoring.
- **`deploy/`:** Docker Compose service topology, Nginx reverse proxy configuration, Supervisor daemon definitions, and automated database backup routines.

---

## 2. Fundamental Architectural Rules

### Rule 1: Official Meta APIs Only
- **Strictly prohibited:** Baileys, WhatsApp Web scraping, puppeteer/selenium automation, QR-code authentication, or unofficial WhatsApp protocols.
- **Mandatory:** Official Meta Graph API v21.0 (WhatsApp Cloud API, Facebook Messenger API, Instagram Direct Messaging API).

### Rule 2: Non-Blocking Webhook Processing
- Webhook endpoints in `apps/core` (`POST /webhooks/meta`) must validate HMAC SHA-256 signatures and return `HTTP 200` in $<150\text{ms}$.
- Heavy processing (AI inference, RAG retrieval, audio transcription) must be dispatched asynchronously to the Redis Stream `inbound_ai_jobs`.

### Rule 3: Database & pgvector Integrity
- PostgreSQL 16 + `pgvector` is the unified database shared across `apps/core` and `apps/agent`.
- All schema migrations reside in `apps/core/database/migrations/`.
- Vector embeddings use 1536 dimensions with an HNSW cosine distance index (`vector_cosine_ops`).

### Rule 4: Human Takeover (Safety Switch)
- When a human agent sends a manual message or toggles `bot_active=false` on a thread:
  - `bot_active` is persisted as `false`.
  - Inbound AI message queuing is suppressed.
  - Staff takeover event is broadcasted across websockets.

---

## 3. Key File Locations & Entrypoints

| Subsystem | Primary File Path | Responsibility |
| :--- | :--- | :--- |
| **Laravel App** | `apps/core/app/Http/Controllers/` | HTTP Controllers & API routes |
| **Meta Webhook** | `apps/core/app/Services/WhatsApp/WebhookHandler.php` | Signature verification & stream dispatch |
| **Outbound Engine**| `apps/core/app/Services/WhatsApp/WhatsAppClient.php` | Rate-limited Meta API message sending |
| **Agent API** | `apps/agent/src/api/` | FastAPI routes (`/health`, `/chat`, `/knowledge`) |
| **LangGraph Machine**| `apps/agent/src/graph/graph.py` | Compiled StateGraph reasoning pipeline |
| **Multi-AI Cascade**| `apps/agent/src/services/llm_factory.py` | Priority provider failover engine |
| **Hybrid RAG** | `apps/agent/src/services/hybrid_retriever.py` | pgvector dense + FTS sparse + Reranker + CRAG |
| **Audio ASR** | `apps/agent/src/services/audio_service.py` | Groq Whisper / Faster-Whisper audio transcription |
| **Lead Scoring** | `apps/agent/src/scoring/lead_scorer.py` | Rule-based lead classification engine |
| **Redis Stream** | `apps/agent/src/workers/redis_consumer.py` | Inbound job worker consuming `inbound_ai_jobs` |

---

## 4. Testing & Verification Workflows

```bash
# Laravel Core Feature & Unit Tests (69 tests)
docker compose exec core php artisan test

# FastAPI & LangGraph Pytest Suite (9 tests)
docker compose exec agent pytest tests/ -v

# Frontend Production Build
docker compose exec core npm run build

# Performance & RAGAS Benchmarks
python scripts/benchmark_outbound.py
python scripts/benchmark_inbound_text.py
python scripts/benchmark_voice_asr.py
python scripts/benchmark_rag.py
python scripts/evaluate_ragas.py
```
