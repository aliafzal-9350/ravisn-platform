# ==============================================================================
# RAVISN Platform: Comprehensive Repository & Architecture Audit (Phase 0)
# ==============================================================================
# Date: September 2026
# Status: Complete
# Target: RAVISN Omnichannel Autonomous AI & Outreach Platform

---

## 1. Executive Summary

This document presents a comprehensive audit of the **`ravisn-platform`** monorepo, covering infrastructure, database schemas, Laravel core services, FastAPI AI agent pipelines, LangGraph state machine, pgvector RAG, outbound campaigns, Meta Graph API integration, real-time WebSockets, testing, and deployment.

---

## 2. Inventory: What Already Exists & Works

### A. Infrastructure & Docker Services
- **7 Container Topology (`docker-compose.yml`):**
  1. `ravisn-postgres`: PostgreSQL 16 with `pgvector` extension and HNSW vector cosine indexing.
  2. `ravisn-redis`: Redis 7.2 Alpine for queuing (`inbound_ai_jobs`), streams, and real-time Pub/Sub (`crm_channel_updates`).
  3. `ravisn-core`: Laravel 11/12 with PHP 8.3-FPM, Nginx, Inertia.js React 19, Tailwind CSS v4.
  4. `ravisn-core-worker`: Dedicated queue worker for `campaigns`, `webhooks`, `default` queues.
  5. `ravisn-agent`: FastAPI 0.115+ asynchronous AI API server running Uvicorn with 4 workers.
  6. `ravisn-agent-worker`: Dedicated Python background worker consuming `inbound_ai_jobs`.
  7. `ravisn-nginx`: Master reverse proxy unifying routing to Laravel Core and FastAPI Agent.

### B. Database Schemas (`apps/core/database/migrations` & `apps/agent/src/db/models.py`)
- **22 PostgreSQL Migrations:**
  - `channel_identities`: Omnichannel support (WhatsApp, Facebook Messenger, Instagram), encrypted tokens, WABA/Page IDs.
  - `contacts`: Unified customer identities (phone numbers, `messenger_psid`, `instagram_igsid`, custom metadata).
  - `threads`: Conversation threads with `bot_active` boolean for human takeover.
  - `messages`: Directions (`inbound`/`outbound`), `channel_type`, `message_type`, AI telemetry (`prompt_tokens`, `completion_tokens`, `latency_ms`, `ai_model`, `detected_intent`).
  - `campaigns` & `campaign_recipients`: Outbound mass broadcast campaigns with scheduling, rate limiting, and status tracking (`queued`, `processing`, `sent`, `delivered`, `read`, `failed`).
  - `knowledge_bases` & `knowledge_chunks`: Document management with `vector(1536)` embeddings and HNSW cosine distance index (`<=>`).
  - `whatsapp_accounts`, `message_templates`, `automation_flows`, `system_notifications`, `passkeys`, `api_keys`, `outgoing_webhooks`.

### C. Laravel Core (`apps/core`)
- **Meta Webhook Gateway (`/api/v1/webhooks/meta`):** Verification handshake (`hub.challenge`) and signature verification ($< 150\text{ms}$ fast ACK response), queuing to `PushInboundToAiJob`.
- **Chat & Human Takeover Endpoints (`/api/v1/threads`):**
  - `PATCH /api/v1/threads/{id}/toggle-bot`
  - `POST /api/v1/threads/{id}/messages` (manual agent reply, dispatches via Meta Graph API v21.0, disables `bot_active`).
- **Outbound Campaign Engine:** `SendCampaignMessage.php`, `DispatchOutboundBroadcastJob.php`, `ProcessCampaign.php` with exponential backoff and recipient rate limiting.
- **WebSocket / Reverb Events:** `MessageCreatedEvent.php` and `ThreadUpdatedEvent.php` broadcasting to `private-chat.thread.{threadId}` and `private-crm.inbox`.
- **Redis Bridge Worker:** `ListenCrmUpdates.php` (`php artisan crm:listen-updates`).

### D. FastAPI AI Layer & LangGraph (`apps/agent`)
- **LLM Cascade Engine (`llm_factory.py`):** Priority fallback cascade: Groq (`llama-3.3-70b-versatile`) $\rightarrow$ Google Gemini (`gemini-2.5-flash`) $\rightarrow$ xAI Grok (`grok-3-mini`) $\rightarrow$ OpenAI (`gpt-4o-mini`).
- **RAG Pipeline (`vector_store.py`, `embedding_service.py`):** Chunking via `RecursiveCharacterTextSplitter`, 1536-dim embeddings, pgvector cosine search against `knowledge_chunks`.
- **Whisper Voice Note Ingestion (`audio_service.py`, `audio_transcriber_node.py`):** Audio download from Meta Graph API, transcription, and LangGraph state forwarding.
- **Channel Formatting Constraints:** WhatsApp markdown formatting, Instagram 1000-character truncation, Messenger limits.

---

## 3. What is Incomplete or Requires Enhancement (Roadmap & Prioritization)

| Area | Item | Status / Plan |
| :--- | :--- | :--- |
| **CRAG & Hybrid RAG** | Implement PostgreSQL Full-Text Search (FTS) + pgvector hybrid retrieval with Cross-Encoder reranker (`ms-marco-MiniLM-L-6-v2`) and Context Quality Grading | Phase 10 & 11 |
| **XGBoost Lead Scoring** | Build feature extraction pipeline (message count, response time, sentiment, intent) + XGBoost classifier & model trainer | Phase 13 |
| **Benchmarking Suite** | Create rigorous performance benchmark scripts for outbound throughput (15-30 msg/s), text latency (<1.8s), ASR latency (<800ms) | Phase 18 |
| **RAGAS Evaluation** | Implement automated RAGAS evaluation suite (Faithfulness $\ge 0.92$, Context Precision $\ge 0.90$) generating `RAG_EVALUATION.md` | Phase 19 |
| **Deployment & CI/CD** | Create Ubuntu/Docker Compose production guides, backup scripts, and GitHub Actions CI workflow | Phases 20–22 |
| **Comprehensive Docs** | Update `README.md`, `AGENTS.md`, `llms.txt`, `ARCHITECTURE.md`, `API.md`, `DATABASE.md`, `DEPLOYMENT.md`, `SECURITY.md`, `TESTING.md`, `RAG.md`, `AI_ARCHITECTURE.md`, `META_INTEGRATION.md`, `TROUBLESHOOTING.md` | Phases 23–25 |

---

## 4. Current Test Suite Status

- **Laravel Core Test Suite:** `69 passed (189 assertions)` across all Authentication, Webhooks, Campaigns, Dashboard, Automations, Developer API, and Settings tests.
- **FastAPI Pytest Suite:** `9 passed (100%)`.
- **Phase 4 & Phase 5 Integration Tests:** All pass 100%.
- **Docker Containers:** All 7 containers healthy and running.
