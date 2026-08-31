# RAVISN Platform: Master Unified Architecture

Enterprise Omni-Channel CRM & Multi-Agent Autonomous Booking & Intelligence Engine.

## Architecture Overview

- **`apps/core`** (Laravel 13 / PHP 8.3 / Inertia React 19 / Tailwind CSS v4): System of record, Auth (Fortify + Google OAuth), CRM UI, Outbound Campaign Dispatcher, and High-Throughput Meta Webhook Ingest Gateway (`/api/v1/webhooks/meta`).
- **`apps/agent`** (FastAPI / Python 3.11+ / LangGraph / pgvector / OpenAI / Whisper / Groq): Autonomous Inbound Intelligence Engine, Voice Transcriber, Semantic RAG Pipeline, and Multi-Agent Conversation Graph.
- **Shared Infrastructure**:
  - **PostgreSQL 16 + pgvector**: Unified database where schema migrations are strictly owned by Laravel.
  - **Redis 7.2**: Queue broker for asynchronous AI processing (`inbound_ai_jobs`), Pub/Sub for real-time CRM updates (`crm_channel_updates`), session mutex locking, and cache.
  - **Nginx Reverse Proxy**: Single ingress point routing traffic between Core CRM, FastAPI agent, and WebSockets.

---

## Quick Start (Docker Compose)

1. **Clone and Configure Environment**:
   ```bash
   cp .env.example .env
   ```

2. **Build and Launch All Services**:
   ```bash
   make setup
   # or
   docker compose up -d
   ```

3. **Run Migrations & Seed**:
   ```bash
   docker compose exec core php artisan migrate --seed
   ```

4. **Access Applications**:
   - **CRM Dashboard & Ingestion**: [http://localhost:8080](http://localhost:8080) (or via Nginx on port 80)
   - **FastAPI AI Agent Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Meta Webhook Endpoint**: `POST /api/v1/webhooks/meta`

---

## Event-Driven Pipeline

1. **Inbound Webhook**: Meta sends events (WhatsApp, Messenger, Instagram) to `POST /api/v1/webhooks/meta`.
2. **Instant ACK & Ingest**: Laravel validates HMAC-SHA256 signature (`X-Hub-Signature-256`), returns HTTP 200 OK (<150ms), persists message in PostgreSQL, and pushes job to Redis `inbound_ai_jobs`.
3. **Multi-Agent Processing**: FastAPI `redis_consumer.py` consumes the job, triggers LangGraph State Machine (Audio Transcriber -> Intent Router -> RAG pgvector -> Guardrails -> Response Generator).
4. **Outbound Reply**: FastAPI dispatches response directly to Meta Graph API v21.0, records AI telemetry (`prompt_tokens`, `latency_ms`, `detected_intent`) in the database, and emits live updates to Redis Pub/Sub (`crm_channel_updates`).

---

## Development Commands

```bash
make test-core     # Run Laravel test suite
make test-agent    # Run FastAPI pytest suite
make pint-fix      # Format PHP code with Pint
```
