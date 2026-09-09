# Production Deployment & Operations Guide — RAVISN Platform

## 1. Docker Topology & Service Manifest

The RAVISN platform is composed of 7 containerized services defined in `docker-compose.yml`:

| Container Name | Service Role | Port Mapping | Healthcheck Protocol |
| :--- | :--- | :--- | :--- |
| `ravisn-postgres` | PostgreSQL 16 + pgvector | `5432:5432` | `pg_isready -U ravisn_user -d ravisn_db` |
| `ravisn-redis` | Redis 7.2 Alpine (Queues/Streams) | `6379:6379` | `redis-cli ping` |
| `ravisn-core` | Laravel 11 App / PHP 8.3 FPM | `9000` (internal)| PHP-FPM socket ping |
| `ravisn-core-worker`| Laravel Queue Outbound Workers | — | Supervisor process inspection |
| `ravisn-agent` | FastAPI Cognitive Intelligence API | `8001:8001` | `curl -f http://localhost:8001/api/v1/health` |
| `ravisn-agent-worker`| Redis Stream Inbound AI Worker | — | Supervisor consumer heartbeat |
| `ravisn-nginx` | Nginx HTTP Reverse Proxy | `8000:80` | `nginx -t && curl -f http://localhost:80` |

---

## 2. Environment Variables Configuration

Ensure all required production secrets are configured in `.env`:

### `apps/core/.env`
```dotenv
APP_NAME=RAVISN
APP_ENV=production
APP_DEBUG=false
APP_URL=https://platform.ravisn.com

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=ravisn_db
DB_USERNAME=ravisn_user
DB_PASSWORD=your_secure_postgres_password

REDIS_HOST=redis
REDIS_PORT=6379

META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_VERIFY_TOKEN=your_meta_webhook_verify_token
```

### `apps/agent/.env`
```dotenv
DATABASE_URL=postgresql+asyncpg://ravisn_user:your_secure_postgres_password@postgres:5432/ravisn_db
REDIS_URL=redis://redis:6379/0

GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIzaSy...
XAI_API_KEY=xai-...
OPENAI_API_KEY=sk-...
```

---

## 3. Deployment Steps

```bash
# 1. Pull latest images and build production containers
docker compose -f docker-compose.yml up -d --build

# 2. Run schema migrations
docker compose exec -e DB_MIGRATION_MODE=true core php artisan migrate --force

For Neon deployments, `DATABASE_URL` and `DATABASE_ASYNC_URL` should use the
`-pooler` hostname for web, API, and worker traffic. `DATABASE_MIGRATION_URL`
should use the direct hostname without `-pooler`, and `DB_MIGRATION_MODE=true`
selects it for Laravel migrations.

Do not run this migration command against an existing database whose schema was
created by a different migration system. The Laravel schema must be provisioned
in a dedicated database or reconciled with an explicit, reviewed migration
before switching Laravel runtime traffic to it.

# 3. Cache Laravel configuration & routes
docker compose exec core php artisan config:cache
docker compose exec core php artisan route:cache
docker compose exec core php artisan view:cache

# 4. Verify system health
curl -s http://localhost:8001/api/v1/health
curl -s http://localhost:8000/up
```

---

## 4. High-Availability Scaling

To scale outbound message workers or AI stream consumer instances:
```bash
docker compose up -d --scale core-worker=4 --scale agent-worker=2
```
