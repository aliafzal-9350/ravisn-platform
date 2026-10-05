"""The inbound AI worker against a real Redis: durability, ordering, bursts."""
import asyncio
import json
import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from redis.asyncio import Redis

from src.config import settings
from src.workers import redis_consumer
from src.workers.redis_consumer import InboundWorker


@pytest_asyncio.fixture
async def redis_client():
    client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await client.ping()
    except Exception:
        pytest.skip("Redis is not reachable")
    yield client
    await client.aclose()


@pytest_asyncio.fixture
async def stream(redis_client):
    name = f"test:ai:{uuid.uuid4().hex}"
    yield name
    await redis_client.delete(name, f"{name}:dead", f"{name}:legacy")


def make_worker(redis_client, stream, handler, latest=None, **overrides):
    async def no_newer_message(_thread_id):
        return None

    options = dict(
        stream=stream, group="test-workers", consumer="test-1", legacy_list=f"{stream}:legacy",
        concurrency=4, debounce_seconds=0, max_attempts=3, claim_idle_ms=60_000,
        block_ms=50, backoff_base_seconds=0,
    )
    options.update(overrides)
    return InboundWorker(redis_client, handler, latest or no_newer_message, **options)


def job(thread_id="t-1", message_id=None, message_type="text"):
    return {
        "thread_id": thread_id,
        "message_id": message_id or uuid.uuid4().hex,
        "message_type": message_type,
        "content": "hi",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def run_until_idle(worker, rounds=10):
    for _ in range(rounds):
        await worker.run_once()
        await worker.wait_idle()


async def test_a_handled_job_is_removed_from_the_stream(redis_client, stream):
    handled = []

    async def handler(j):
        handled.append(j["message_id"])

    worker = make_worker(redis_client, stream, handler)
    await worker.setup()
    first = job()
    await worker.enqueue(first)

    await run_until_idle(worker, rounds=2)

    assert handled == [first["message_id"]]
    assert await redis_client.xlen(stream) == 0
    assert (await redis_client.xpending(stream, "test-workers"))["pending"] == 0


async def test_a_failing_job_is_retried_and_then_dead_lettered(redis_client, stream):
    calls = []

    async def handler(j):
        calls.append(j["message_id"])
        raise RuntimeError("LLM provider down")

    worker = make_worker(redis_client, stream, handler)
    await worker.setup()
    await worker.enqueue(job())

    await run_until_idle(worker)

    assert len(calls) == 3, "tried exactly max_attempts times"
    dead = await redis_client.xrange(f"{stream}:dead")
    assert len(dead) == 1 and "LLM provider down" in dead[0][1]["error"]
    assert await redis_client.xlen(stream) == 0


async def test_a_transient_failure_then_success_is_delivered_once(redis_client, stream):
    calls = []

    async def handler(j):
        calls.append(1)
        if len(calls) == 1:
            raise RuntimeError("Meta 503")

    worker = make_worker(redis_client, stream, handler)
    await worker.setup()
    await worker.enqueue(job())

    await run_until_idle(worker)

    assert len(calls) == 2
    assert await redis_client.xlen(f"{stream}:dead") == 0


async def test_a_job_abandoned_by_a_crashed_worker_is_taken_over(redis_client, stream):
    handled = []

    async def handler(j):
        handled.append(j["message_id"])

    crashed = make_worker(redis_client, stream, handler, consumer="crashed")
    await crashed.setup()
    abandoned = job()
    await crashed.enqueue(abandoned)
    # The crashed worker read the job but never acknowledged it.
    await redis_client.xreadgroup("test-workers", "crashed", {stream: ">"}, count=1)

    survivor = make_worker(redis_client, stream, handler, consumer="survivor", claim_idle_ms=0)
    await run_until_idle(survivor, rounds=2)

    assert handled == [abandoned["message_id"]]
    assert (await redis_client.xpending(stream, "test-workers"))["pending"] == 0


async def test_a_burst_of_texts_gets_one_reply_for_the_newest_message(redis_client, stream):
    handled = []
    burst = [job(thread_id="burst") for _ in range(3)]

    async def handler(j):
        handled.append(j["message_id"])

    async def latest(_thread_id):
        return burst[-1]["message_id"]

    worker = make_worker(redis_client, stream, handler, latest=latest)
    await worker.setup()
    for j in burst:
        await worker.enqueue(j)

    await run_until_idle(worker, rounds=2)

    assert handled == [burst[-1]["message_id"]]


async def test_voice_notes_are_never_skipped_by_the_burst_rule(redis_client, stream):
    handled = []
    voice = job(thread_id="burst", message_type="audio")
    text = job(thread_id="burst")

    async def handler(j):
        handled.append(j["message_id"])

    async def latest(_thread_id):
        return text["message_id"]

    worker = make_worker(redis_client, stream, handler, latest=latest)
    await worker.setup()
    await worker.enqueue(voice)
    await worker.enqueue(text)

    await run_until_idle(worker, rounds=2)

    assert sorted(handled) == sorted([voice["message_id"], text["message_id"]])


async def test_one_conversation_is_handled_one_job_at_a_time(redis_client, stream):
    active = {"now": 0, "max": 0}

    async def handler(j):
        active["now"] += 1
        active["max"] = max(active["max"], active["now"])
        await asyncio.sleep(0.05)
        active["now"] -= 1

    worker = make_worker(redis_client, stream, handler)
    await worker.setup()
    for _ in range(3):
        await worker.enqueue(job(thread_id="same-thread", message_type="audio"))

    await run_until_idle(worker, rounds=2)

    assert active["max"] == 1


async def test_different_conversations_are_handled_in_parallel(redis_client, stream):
    active = {"now": 0, "max": 0}

    async def handler(j):
        active["now"] += 1
        active["max"] = max(active["max"], active["now"])
        await asyncio.sleep(0.1)
        active["now"] -= 1

    worker = make_worker(redis_client, stream, handler)
    await worker.setup()
    for n in range(3):
        await worker.enqueue(job(thread_id=f"thread-{n}"))

    await run_until_idle(worker, rounds=2)

    assert active["max"] == 3


async def test_jobs_left_on_the_old_list_are_moved_into_the_stream(redis_client, stream):
    handled = []

    async def handler(j):
        handled.append(j["message_id"])

    worker = make_worker(redis_client, stream, handler)
    await worker.setup()
    legacy = job()
    await redis_client.rpush(f"{stream}:legacy", json.dumps(legacy))

    assert await worker.drain_legacy_list() == 1
    await run_until_idle(worker, rounds=2)

    assert handled == [legacy["message_id"]]


class _NoDatabase:
    """Stands in for the DB session: these tests never touch a real database."""

    def add(self, _row):
        pass

    async def execute(self, *_args, **_kwargs):
        return None

    async def commit(self):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False


async def test_a_reply_already_sent_is_not_sent_again(redis_client, monkeypatch):
    """A job retried after its reply went out must not message the customer twice."""
    message_id = uuid.uuid4().hex
    await redis_client.set(f"ai:replied:{message_id}", "wamid.1", ex=60)

    async def credentials(_channel_id):
        return "token", "phone-1"

    async def active(_thread_id):
        return True

    async def fake_graph(_state):
        return {"final_response": "Hello again", "decision": "reply", "telemetry": {}}

    class Meta:
        sent = []

        async def send_message(self, **kwargs):
            self.sent.append(kwargs)
            return {"messages": [{"id": "wamid.2"}]}

    monkeypatch.setattr(redis_consumer, "_channel_credentials", credentials)
    monkeypatch.setattr(redis_consumer, "_bot_is_active", active)
    monkeypatch.setattr(redis_consumer.compiled_agent_graph, "ainvoke", fake_graph)
    monkeypatch.setattr(redis_consumer, "async_session_factory", _NoDatabase)
    meta = Meta()

    try:
        await redis_consumer.process_job(
            {"thread_id": str(uuid.uuid4()), "contact_id": str(uuid.uuid4()), "message_id": message_id, "sender_id": "+1555"},
            redis_client, meta,
        )
    finally:
        await redis_client.delete(f"ai:replied:{message_id}")

    assert meta.sent == []


async def test_whatsapp_replies_go_out_from_the_channels_own_number(redis_client, monkeypatch):
    async def credentials(_channel_id):
        return "tenant-token", "tenant-phone-id"

    async def active(_thread_id):
        return True

    async def fake_graph(_state):
        return {"final_response": "Hi!", "decision": "reply", "telemetry": {}}

    class Meta:
        sent = []

        async def send_message(self, **kwargs):
            self.sent.append(kwargs)
            return {"messages": [{"id": "wamid.9"}]}

    monkeypatch.setattr(redis_consumer, "_channel_credentials", credentials)
    monkeypatch.setattr(redis_consumer, "_bot_is_active", active)
    monkeypatch.setattr(redis_consumer.compiled_agent_graph, "ainvoke", fake_graph)
    monkeypatch.setattr(redis_consumer, "async_session_factory", _NoDatabase)
    meta = Meta()
    message_id = uuid.uuid4().hex

    try:
        await redis_consumer.process_job(
            {"thread_id": str(uuid.uuid4()), "contact_id": str(uuid.uuid4()), "message_id": message_id,
             "sender_id": "+1555", "channel": "whatsapp", "channel_identity_id": str(uuid.uuid4())},
            redis_client, meta,
        )
    finally:
        await redis_client.delete(f"ai:replied:{message_id}")

    assert meta.sent[0]["phone_number_id"] == "tenant-phone-id"
    assert meta.sent[0]["access_token"] == "tenant-token"
