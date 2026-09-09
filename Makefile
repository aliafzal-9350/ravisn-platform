.PHONY: setup up down restart logs migrate seed test pint pint-fix lint test-core test-agent worker-core worker-agent

setup:
	cp .env.example .env
	docker compose build
	docker compose up -d postgres redis
	sleep 5
	docker compose run --rm core php artisan migrate --seed
	docker compose up -d

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

migrate:
	docker compose exec core php artisan migrate

seed:
	docker compose exec core php artisan db:seed

pint-fix:
	docker compose exec core vendor/bin/pint --dirty --format agent

test-core:
	docker compose exec core php artisan test --compact

test-agent:
	docker compose exec agent pytest -v

worker-core:
	docker compose exec core php artisan queue:work redis --queue=campaigns,webhooks,default

worker-agent:
	docker compose exec agent python -m src.workers.redis_consumer
