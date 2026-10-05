# Production Deployment & Operations Guide — RAVISN Platform

## 1. Docker Topology & Service Manifest

`docker-compose.yml` is the production topology and is secure by default: **only the
nginx gateway publishes ports**. Everything else is reachable on the internal docker
network only.

| Container | Role | Published | Notes |
| :--- | :--- | :--- | :--- |
| `ravisn-nginx` | Reverse proxy, the only public entrypoint | `80`, `443` | Routes `/` to Laravel and `/app/` to Reverb. Never routes to the agent. |
| `ravisn-core` | Laravel 11 app (PHP-FPM + nginx) | — | Health: `GET /up` |
| `ravisn-core-worker` | Queue worker (`campaigns,webhooks,default`) | — | |
| `ravisn-core-scheduler` | `php artisan schedule:work` (scheduled campaigns) | — | Without it, scheduled campaigns never send. |
| `ravisn-core-crm-listener` | Redis Pub/Sub → Reverb bridge | — | |
| `ravisn-core-automation-consumer` | Automation trigger stream consumer | — | |
| `ravisn-core-reverb` | WebSockets | — | Proxied by nginx at `/app/` |
| `ravisn-agent` | FastAPI agent API (internal) | — | Requires `X-Internal-Token`; `/docs` disabled in production |
| `ravisn-agent-worker` | Inbound AI queue consumer | — | |
| `ravisn-postgres` | PostgreSQL 16 + pgvector | — | Optional when using managed Postgres (Neon) |
| `ravisn-redis` | Redis 7.2 (password protected) | — | `noeviction`: queued jobs are never silently evicted |

**Storage:** all Laravel containers share the `corestorage` volume (`storage/app`): knowledge uploads,
campaign and template media (served at `/storage/...`, which Meta fetches) and channel profile pictures.
Back it up together with the database, e.g.
`docker run --rm -v ravisn-platform_corestorage:/data -v $PWD:/backup alpine tar czf /backup/storage.tgz -C /data .`
Set `MEDIA_DISK` only if you move these files to another disk (the S3 driver package is not installed yet).

For local development, add the dev overlay. It mounts the source and publishes debug ports on
`127.0.0.1` only:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d   # or: make up
```

Never use the dev overlay on a server.

---

## 2. Required Configuration

The root `.env` is shared by every container. Compose refuses to start until these are set
(generate each with `openssl rand -hex 32`; use hex because they are embedded in `redis://` URLs):

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://platform.example.com
APP_KEY=base64:...            # identical for Laravel and the agent (the agent decrypts channel tokens with it)

REDIS_PASSWORD=<hex>
AGENT_INTERNAL_TOKEN=<hex>    # Laravel sends it; the agent requires it
POSTGRES_PASSWORD=<hex>       # bundled Postgres only; set DB_PASSWORD to the same value

META_APP_SECRET=...           # webhooks are rejected in production without it
META_WEBHOOK_VERIFY_TOKEN=... # shown on the Connect page; must match the Meta app setting
SESSION_SECURE_COOKIE=true
```

> **APP_KEY:** Meta access tokens and app secrets are stored encrypted with `APP_KEY`.
> Rotating or losing it makes every connected channel unreadable, so back it up with the
> database credentials.

---

## 3. TLS

nginx listens on port 80. Terminate HTTPS in front of it, using one of:

- **Cloudflare** (proxied DNS, SSL mode *Full*), or a cloud load balancer, forwarding to port 80; or
- a `listen 443 ssl` server block in `deploy/nginx/conf.d/` with your certificates (e.g. certbot),
  plus a port-80 server that redirects to HTTPS.

Laravel trusts `X-Forwarded-Proto` from the private docker network, so URLs and cookies are
`https` once TLS is in front. nginx already sends HSTS and the standard security headers.

---

## 4. Deployment Steps

```bash
# 1. Build and start (base file only, no dev overlay)
docker compose up -d --build

# 2. Run migrations (encrypts existing channel credentials and adds knowledge-base ownership)
docker compose exec -e DB_MIGRATION_MODE=true core php artisan migrate --force

# 3. Cache configuration, routes and views
docker compose exec core php artisan config:cache
docker compose exec core php artisan route:cache
docker compose exec core php artisan view:cache

# 4. Verify health from inside the network
docker compose exec core curl -fsS http://localhost/up
docker compose exec agent curl -fsS http://localhost:8000/api/v1/health/

# 5. Verify nothing internal is exposed (run from another machine)
nc -zv <server> 5432 6379 8000 8001 8080   # all must be refused
curl -i https://<domain>/docs              # must not be the FastAPI docs
```

For Neon deployments, `DATABASE_URL` and `DATABASE_ASYNC_URL` should use the `-pooler`
hostname for web, API and worker traffic. `DATABASE_MIGRATION_URL` should use the direct
hostname without `-pooler`, and `DB_MIGRATION_MODE=true` selects it for Laravel migrations.

Do not run the migration command against an existing database whose schema was created by a
different migration system. Provision the Laravel schema in a dedicated database, or reconcile
it with an explicit, reviewed migration, before switching Laravel runtime traffic to it.

---

## 4b. Free database backups

Supabase only offers backups on paid plans. `scripts/backup-db.ps1` (Windows) runs `pg_dump` in a
throwaway Postgres 17 container and writes `../ravisn-backups/ravisn-<date>.sql.gz`, outside the
project so it can never be committed. Run it before every migration (`scripts\dev.ps1 migrate`
does this automatically) and copy the file somewhere safe, e.g. Google Drive.
Restore with: `gunzip -c file.sql.gz | psql "<DATABASE_URL>"`.

---

## 5. Monitoring

1. **Errors:** create a free project at sentry.io and set `SENTRY_DSN` in `.env`. Laravel, the
   agent API and the AI worker all report to it. Customer message content and personal data are
   never sent.
2. **Uptime:** add a free monitor (UptimeRobot or Better Stack) for `https://<domain>/up`, with
   email/WhatsApp alerts. `core` and `agent` also have Docker healthchecks (`docker compose ps`).
3. **AI jobs that failed 3 times** go to the Redis stream `ai:inbound:dead`. Check it with
   `docker compose exec redis redis-cli -a "$REDIS_PASSWORD" XRANGE ai:inbound:dead - +`.

---

## 6. Scaling

```bash
docker compose up -d --scale core-worker=4 --scale agent-worker=2
```

Remove `container_name` from a service before scaling it beyond one replica.
