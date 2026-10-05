.PHONY: setup up prod-up down restart logs migrate seed test pint pint-fix lint test-core test-agent worker-core worker-agent

# Local development uses the dev overlay (source mounts + localhost-only ports).
# Production runs the base file alone: `make prod-up`.
DC = docker compose -f docker-compose.yml -f docker-compose.dev.yml

setup:
	cp .env.example .env
	$(DC) build
	$(DC) up -d postgres redis
	sleep 5
	$(DC) run --rm core php artisan migrate --seed
	$(DC) up -d

up:
	$(DC) up -d

prod-up:
	docker compose -f docker-compose.yml up -d --build

down:
	$(DC) down

restart:
	$(DC) restart

logs:
	$(DC) logs -f

migrate:
	$(DC) exec core php artisan migrate

seed:
	$(DC) exec core php artisan db:seed

pint-fix:
	$(DC) exec core vendor/bin/pint --dirty --format agent

test-core:
	$(DC) exec core php artisan test --compact

test-agent:
	$(DC) exec agent pytest -v

worker-core:
	$(DC) exec core php artisan queue:work redis --queue=campaigns,webhooks,default

worker-agent:
	$(DC) exec agent python -m src.workers.redis_consumer
