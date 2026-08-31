.PHONY: setup up down migrate seed test pint pint-fix lint worker test-core test-agent

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

migrate:
	docker compose exec core php artisan migrate

pint-fix:
	docker compose exec core vendor/bin/pint --dirty --format agent

test-core:
	docker compose exec core php artisan test --compact

test-agent:
	docker compose exec agent pytest
