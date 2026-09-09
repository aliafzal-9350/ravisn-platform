# Troubleshooting & Diagnostics Guide — RAVISN Platform

## 1. Common Diagnostics Commands

```bash
# Check container status
docker compose ps

# Inspect logs for core worker
docker compose logs -f core-worker

# Inspect logs for agent AI worker
docker compose logs -f agent-worker

# Verify Redis connection and stream backlog
docker compose exec redis redis-cli xlen inbound_ai_jobs
docker compose exec redis redis-cli xinfo groups inbound_ai_jobs
```

---

## 2. Common Scenarios & Resolutions

### Issue 1: Webhook Returns 403 Forbidden
- **Cause:** `META_APP_SECRET` in `apps/core/.env` does not match the Meta App Secret used by the incoming request signature, or `META_VERIFY_TOKEN` is incorrect.
- **Fix:** Update `META_APP_SECRET` and `META_VERIFY_TOKEN` in `apps/core/.env` and reload config:
  ```bash
  docker compose exec core php artisan config:clear
  ```

### Issue 2: AI Not Replying to Thread
- **Cause:** Thread has `bot_active = false` (human agent takeover active) or contact is paused.
- **Fix:** Check `threads.bot_active` in database or trigger the toggle API:
  ```bash
  curl -X POST http://localhost:8000/api/v1/inbox/threads/<id>/toggle-bot -H "Content-Type: application/json" -d '{"bot_active": true}'
  ```

### Issue 3: pgvector Extension Missing
- **Fix:** Verify `pgvector/pgvector:pg16` is used in `docker-compose.yml` and run:
  ```bash
  docker compose exec postgres psql -U ravisn_user -d ravisn_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
  ```
