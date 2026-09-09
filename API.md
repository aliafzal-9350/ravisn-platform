# API Reference & Specification — RAVISN Omnichannel Platform

## 1. Meta Webhook Gateway Endpoints (`apps/core`)

### 1.1 Webhook Verification (Challenge Handshake)
- **Method:** `GET`
- **Path:** `/webhooks/meta`
- **Query Parameters:**
  - `hub.mode` (string, required): Value must be `subscribe`.
  - `hub.verify_token` (string, required): Configured secret token (`META_VERIFY_TOKEN`).
  - `hub.challenge` (string, required): Challenge string returned in plain text on match.
- **Responses:**
  - `200 OK`: Returns `hub.challenge` plain string.
  - `403 Forbidden`: Token mismatch.

### 1.2 Inbound Message Receiver
- **Method:** `POST`
- **Path:** `/webhooks/meta`
- **Headers:**
  - `X-Hub-Signature-256` (string, required): HMAC SHA-256 hash using `META_APP_SECRET`.
  - `Content-Type`: `application/json`
- **Response:**
  - `200 OK`: `{"status": "EVENT_RECEIVED"}` (returned in $<150\text{ms}$).

---

## 2. CRM & Inbox Endpoints (`apps/core`)

### 2.1 Toggle Autonomous AI Status (Human Takeover)
- **Method:** `POST`
- **Path:** `/api/v1/inbox/threads/{id}/toggle-bot`
- **Payload:**
```json
{
  "bot_active": false
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "thread_id": 42,
  "bot_active": false,
  "message": "AI assistant paused for human agent takeover."
}
```

### 2.2 Send Manual Staff Message
- **Method:** `POST`
- **Path:** `/api/v1/inbox/threads/{id}/messages`
- **Payload:**
```json
{
  "content": "Hello! I am taking over this conversation to assist you personally.",
  "message_type": "text"
}
```
- **Behavior:** Automatically sets `threads.bot_active = false` and broadcasts to websockets.

---

## 3. Autonomous AI Engine Endpoints (`apps/agent`)

### 3.1 Health & Telemetry Check
- **Method:** `GET`
- **Path:** `/api/v1/health`
- **Response (`200 OK`):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected",
  "ai_providers": {
    "groq": "available",
    "gemini": "available",
    "xai": "available",
    "openai": "available"
  }
}
```

### 3.2 Synchronous Chat Execution
- **Method:** `POST`
- **Path:** `/api/v1/chat`
- **Payload:**
```json
{
  "message": "What are your enterprise SLA guarantees?",
  "thread_id": "thr_987654",
  "channel": "whatsapp",
  "contact_id": 101
}
```
- **Response (`200 OK`):**
```json
{
  "response": "Under the RAVISN Enterprise tier, customers receive a 99.99% uptime SLA guarantee along with 24/7 dedicated engineering support.",
  "intent": "sales",
  "telemetry": {
    "llm_provider": "groq",
    "model_name": "llama-3.3-70b-versatile",
    "generation_latency_ms": 248.5,
    "prompt_tokens": 340,
    "completion_tokens": 42,
    "rag_chunks_retrieved": 2,
    "crag_quality_grade": "HIGH"
  },
  "lead_score": {
    "score": 85,
    "category": "hot"
  }
}
```

### 3.3 Knowledge Ingestion
- **Method:** `POST`
- **Path:** `/api/v1/knowledge/ingest`
- **Payload:**
```json
{
  "title": "Enterprise Terms & SLA",
  "content": "RAVISN Enterprise tier includes 99.99% uptime SLA guarantee...",
  "tenant_id": 1
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "knowledge_base_id": 5,
  "chunks_created": 3
}
```
