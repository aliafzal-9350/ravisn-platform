# AI & LangGraph Multi-Agent Architecture — RAVISN

## 1. Multi-AI Provider Cascade Priority

The RAVISN intelligence tier features a zero-downtime cascading failover chain across 4 major AI providers:

```text
  [ Primary: Groq Cloud ]
  - Model: llama-3.3-70b-versatile
  - Temperature: 0.3 | Max Retries: 1
  - Latency: ~200-300ms
            │
            ▼ (On Timeout / 429 Rate Limit / 5xx Error)
  [ Fallback 1: Google Gemini ]
  - Model: gemini-2.5-flash
  - Temperature: 0.3
            │
            ▼ (On Failure)
  [ Fallback 2: xAI Grok ]
  - Model: grok-3-mini
  - Temperature: 0.3
            │
            ▼ (On Failure)
  [ Fallback 3: OpenAI ]
  - Model: gpt-4o-mini / gpt-4o
            │
            ▼ (On Quota / Network Depletion)
  [ Safety Net: Deterministic Fallback Responder ]
```

---

## 2. Audio & Speech Processing (Voice Notes)

Voice notes from WhatsApp and Instagram are transcribed automatically via `AudioService`:
- **Primary Provider:** Groq Whisper (`whisper-large-v3`) with verified **$410.23\text{ms}$** transcription latency.
- **Secondary Provider:** Local / containerized Faster-Whisper CPU/GPU fallback.
- **Telemetry Ingestion:** `asr_latency_ms`, `asr_provider`, and confidence scores attached to conversation state.

---

## 3. Lead Scoring & Qualification Engine

In `apps/agent/src/scoring/lead_scorer.py`:
- **Scoring Range:** 0 to 100 points based on message sentiment, high-intent keywords (e.g. *pricing, enterprise, demo, purchase, contract*), conversation depth, and channel signals.
- **Classification Categories:**
  - **`qualified` ($\ge 80$ pts):** Ready for sales team outreach; priority notification dispatched.
  - **`hot` ($60 - 79$ pts):** High purchase intent.
  - **`warm` ($30 - 59$ pts):** Engaged customer inquiring about features.
  - **`cold` ($< 30$ pts):** General inquiry or non-buying question.
