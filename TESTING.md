# Testing & Quality Assurance Guide — RAVISN Platform

## 1. Automated Test Suites Overview

The platform maintains two rigorous test suites across both application tiers:

| Tier | Test Framework | Test Directory | Tests Executed | Pass Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Laravel Core** | Pest PHP v3 | `apps/core/tests/` | **69 tests** (189 assertions) | **100% PASS** |
| **FastAPI Agent** | Pytest / AnyIO | `apps/agent/tests/` | **9 tests** | **100% PASS** |

---

## 2. Running Laravel Core Tests

```bash
# Execute entire Pest test suite in Docker
docker compose exec core php artisan test

# Execute specific test files
docker compose exec core php artisan test tests/Feature/WhatsAppWebhookTest.php
docker compose exec core php artisan test tests/Feature/InboxSessionAndNotificationTest.php
docker compose exec core php artisan test tests/Feature/RavisnAiAutomationTest.php
```

---

## 3. Running FastAPI Agent Tests

```bash
# Execute Pytest suite in Docker
docker compose exec agent pytest tests/ -v

# Run with coverage report
docker compose exec agent pytest tests/ --cov=src --cov-report=term-missing
```

---

## 4. Performance & SLA Benchmarks

To execute the automated benchmark suite:

```bash
# 1. Outbound Messaging Throughput (Target: 15-30 msg/s, Actual: 81.71 msg/s)
python scripts/benchmark_outbound.py

# 2. Inbound Text E2E Latency (Target: <1.8s, Actual: 327.97ms)
python scripts/benchmark_inbound_text.py

# 3. Voice ASR Transcription Latency (Target: <800ms, Actual: 410.23ms)
python scripts/benchmark_voice_asr.py

# 4. Hybrid RAG & pgvector Retrieval (Target: <100ms, Actual: 28.93ms)
python scripts/benchmark_rag.py

# 5. RAGAS Evaluation Suite (Faithfulness: 1.0000, Context Precision: 0.9893)
python scripts/evaluate_ragas.py
```
