"""Inbound AI worker: turns queued customer messages into AI replies.

Jobs arrive on a Redis Stream (settings.INBOUND_AI_STREAM) written by Laravel's
PushInboundToAiJob and are read through a consumer group, so:

- a job is only removed once it has been handled; if the worker crashes, the
  job stays pending and is taken over (XAUTOCLAIM) instead of being lost;
- up to AGENT_WORKER_CONCURRENCY jobs run at once, but only one per
  conversation, so replies never overtake each other;
- a text message waits AI_DEBOUNCE_SECONDS; when the customer has sent more in
  the meantime, it steps aside and the newest message answers the whole burst;
- failures are retried with backoff and, after AI_MAX_ATTEMPTS, moved to the
  dead-letter stream (<stream>:dead) where they can be inspected.
"""
import asyncio
import json
import logging
import os
import socket
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from redis.asyncio import Redis
from redis.exceptions import ResponseError
from sqlalchemy import select, update

from src.config import settings
from src.db.models import ChannelIdentity, Message, Thread
from src.db.session import async_session_factory
from src.graph.graph import compiled_agent_graph
from src.services.laravel_crypt import decrypt_or_none
from src.services.meta_client import MetaGraphClient, MetaTransientError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("redis_consumer")

# Release a lock only if we still own it.
_RELEASE_LOCK = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end"


async def _bot_is_active(thread_id) -> bool:
    """Whether autonomous replies are still allowed for this thread right now.

    A human agent can take over while a job is already queued or the graph is
    running; the enqueue-time check alone cannot see that.
    """
    try:
        async with async_session_factory() as session:
            active = await session.scalar(
                select(Thread.bot_active).where(Thread.id == uuid.UUID(str(thread_id)))
            )
            return bool(active) if active is not None else True
    except Exception as e:
        logger.warning(f"[RedisConsumer] bot_active re-check failed, assuming active: {e}")
        return True


async def _channel_credentials(channel_identity_id) -> Tuple[str, Optional[str]]:
    """The channel's decrypted Meta access token and its external id.

    For WhatsApp the external id is the phone number id replies are sent from.
    Laravel stores tokens with its `encrypted` cast and never puts them in the
    queue, so a Redis read never exposes a usable credential.
    """
    if not channel_identity_id:
        return "", None
    try:
        async with async_session_factory() as session:
            row = (await session.execute(
                select(ChannelIdentity.access_token, ChannelIdentity.external_id).where(
                    ChannelIdentity.id == uuid.UUID(str(channel_identity_id))
                )
            )).first()
    except Exception as e:
        logger.error(f"[RedisConsumer] Could not load channel {channel_identity_id}: {e}")
        return "", None

    if row is None:
        return "", None

    token = decrypt_or_none(row.access_token, settings.APP_KEY)
    if row.access_token and not token:
        logger.error(
            f"[RedisConsumer] Channel {channel_identity_id} token could not be decrypted; "
            "check that the agent's APP_KEY matches Laravel's."
        )
    return token or "", row.external_id


async def _channel_access_token(channel_identity_id) -> str:
    token, _ = await _channel_credentials(channel_identity_id)
    return token


async def _latest_inbound_message_id(thread_id) -> Optional[str]:
    """Id of the customer's most recent message in the thread, if any."""
    try:
        async with async_session_factory() as session:
            latest = await session.scalar(
                select(Message.id)
                .where(Message.thread_id == uuid.UUID(str(thread_id)), Message.direction == "inbound")
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            return str(latest) if latest is not None else None
    except Exception as e:
        logger.warning(f"[RedisConsumer] Latest-message lookup failed, not debouncing: {e}")
        return None


async def process_job(job_data: Dict[str, Any], redis_client: Redis, meta_client: MetaGraphClient) -> None:
    """Run the agent for one inbound message and deliver the reply.

    Raises on failures worth retrying (the graph failing, Meta unreachable).
    A reply Meta refuses for good (invalid token, closed 24h window) is stored
    as failed instead, because retrying cannot fix it.
    """
    thread_id = job_data.get("thread_id")
    contact_id = job_data.get("contact_id")
    channel = job_data.get("channel", "whatsapp")
    sender_id = job_data.get("sender_id")
    message_type = job_data.get("message_type", "text")
    message_id = job_data.get("message_id")

    access_token, external_id = await _channel_credentials(job_data.get("channel_identity_id"))
    # Jobs queued before the token moved out of Redis still carry it.
    access_token = access_token or job_data.get("access_token", "")

    logger.info(f"📥 Processing AI Task for Thread: {thread_id} | Type: {message_type}")

    # 1. Execute LangGraph State Machine
    initial_state = {
        "tenant_id": job_data.get("tenant_id"),
        "thread_id": str(thread_id),
        "message_id": str(message_id) if message_id else None,
        "contact_id": str(contact_id),
        "channel": channel,
        "channel_identity_id": str(job_data.get("channel_identity_id", "")),
        "sender_id": str(sender_id),
        "message_type": message_type,
        "raw_content": job_data.get("content"),
        "media_id": job_data.get("media_id"),
        "mime_type": job_data.get("mime_type"),
        "access_token": access_token,
        "messages": [],
        "rag_context": "",
        "intent": "",
        "final_response": "",
        "decision": "reply",
        "telemetry": {},
        "ai_config": job_data.get("ai_config") or {},
    }

    final_state = await compiled_agent_graph.ainvoke(initial_state)

    final_response = final_state.get("final_response")
    decision = final_state.get("decision", "reply")
    telemetry = final_state.get("telemetry", {})

    # 1b. A human may have taken over while the graph was running — never
    # send an autonomous reply into a conversation an agent now owns.
    if decision == "reply" and not await _bot_is_active(thread_id):
        logger.info(f"⏸️  Skipping AI reply for Thread {thread_id}: human takeover is active")
        return

    # A retried job must never send the same reply twice.
    replied_key = f"ai:replied:{message_id}" if message_id else None
    if replied_key and await redis_client.exists(replied_key):
        logger.info(f"[RedisConsumer] Reply for message {message_id} was already sent; skipping duplicate.")
        return

    # 2. Dispatch Reply via Meta Graph API, from this channel's own number/page.
    external_msg_id = None
    send_error = None
    if final_response and access_token and sender_id:
        reply_result = await meta_client.send_message(
            channel=channel,
            recipient_id=sender_id,
            text=final_response,
            access_token=access_token,
            phone_number_id=external_id if channel == "whatsapp" else None,
        )
        if reply_result.get("error"):
            send_error = {"status_code": reply_result.get("status_code"), "error": str(reply_result.get("error"))[:1000]}
        else:
            external_msg_id = (reply_result.get("messages") or [{}])[0].get("id") or reply_result.get("message_id")
            if replied_key:
                await redis_client.set(replied_key, external_msg_id or "1", ex=86400)

    status = "sent" if external_msg_id else ("failed" if send_error else "queued")

    # 3. Store Outbound Message & AI Telemetry in PostgreSQL
    outbound_msg_id = str(uuid.uuid4())
    raw_payload = {"telemetry": telemetry}
    if send_error:
        raw_payload["send_error"] = send_error
    try:
        async with async_session_factory() as session:
            outbound_msg = Message(
                id=uuid.UUID(outbound_msg_id),
                thread_id=uuid.UUID(thread_id) if isinstance(thread_id, str) else thread_id,
                contact_id=uuid.UUID(contact_id) if isinstance(contact_id, str) else contact_id,
                direction="outbound",
                channel_type=channel,
                external_message_id=external_msg_id,
                message_type="text",
                content=final_response,
                status=status,
                is_ai_generated=True,
                ai_model=telemetry.get("model", settings.OPENAI_CHAT_MODEL),
                detected_intent=final_state.get("intent"),
                prompt_tokens=telemetry.get("prompt_tokens"),
                completion_tokens=telemetry.get("completion_tokens"),
                latency_ms=telemetry.get("latency_ms"),
                confidence_score=telemetry.get("confidence_score"),
                raw_payload=raw_payload,
            )
            session.add(outbound_msg)
            if thread_id:
                await session.execute(
                    update(Thread).where(Thread.id == uuid.UUID(str(thread_id))).values(last_message_at=datetime.utcnow())
                )
            await session.commit()
    except Exception as db_err:
        logger.error(f"[RedisConsumer] Failed to write Message to DB: {db_err}")

    # 4. Notify CRM via Redis Pub/Sub for Live UI Refresh
    try:
        await redis_client.publish(
            settings.CRM_BROADCAST_CHANNEL,
            json.dumps({
                "event": "MessageCreated",
                "thread_id": str(thread_id),
                "message_id": outbound_msg_id,
                "direction": "outbound",
                "content": final_response,
                "is_ai_generated": True,
                "intent": final_state.get("intent"),
                "message": {
                    "id": outbound_msg_id,
                    "thread_id": str(thread_id),
                    "contact_id": str(contact_id),
                    "direction": "outbound",
                    "channel_type": channel,
                    "message_type": "text",
                    "content": final_response,
                    "status": status,
                    "is_ai_generated": True,
                    "ai_model": telemetry.get("model", settings.OPENAI_CHAT_MODEL),
                    "detected_intent": final_state.get("intent"),
                    "latency_ms": telemetry.get("latency_ms"),
                    "prompt_tokens": telemetry.get("prompt_tokens"),
                    "completion_tokens": telemetry.get("completion_tokens"),
                    "confidence_score": telemetry.get("confidence_score"),
                    "telemetry": telemetry,
                    "rag_chunk": telemetry.get("cited_chunk"),
                    "created_at": datetime.utcnow().isoformat(),
                }
            })
        )
    except Exception as pub_err:
        logger.warning(f"[RedisConsumer] Pub/Sub broadcast skipped: {pub_err}")


class InboundWorker:
    """Consumes the AI job stream: concurrent, ordered per conversation, crash-safe."""

    def __init__(
        self,
        redis_client: Redis,
        handler: Callable[[Dict[str, Any]], Awaitable[None]],
        latest_inbound_id: Callable[[Any], Awaitable[Optional[str]]] = _latest_inbound_message_id,
        *,
        stream: Optional[str] = None,
        group: Optional[str] = None,
        consumer: Optional[str] = None,
        legacy_list: Optional[str] = None,
        concurrency: Optional[int] = None,
        debounce_seconds: Optional[float] = None,
        max_attempts: Optional[int] = None,
        claim_idle_ms: Optional[int] = None,
        block_ms: int = 2000,
        lock_ttl_ms: int = 180_000,
        lock_wait_seconds: float = 120.0,
        backoff_base_seconds: float = 2.0,
    ):
        self.redis = redis_client
        self.handler = handler
        self.latest_inbound_id = latest_inbound_id
        self.stream = stream or settings.INBOUND_AI_STREAM
        self.dead_letter = f"{self.stream}:dead"
        self.group = group or settings.AI_WORKER_GROUP
        self.consumer = consumer or f"{socket.gethostname()}-{os.getpid()}"
        self.legacy_list = legacy_list if legacy_list is not None else settings.INBOUND_AI_STREAM_KEY
        self.concurrency = concurrency or settings.AGENT_WORKER_CONCURRENCY
        self.debounce_seconds = settings.AI_DEBOUNCE_SECONDS if debounce_seconds is None else debounce_seconds
        self.max_attempts = max_attempts or settings.AI_MAX_ATTEMPTS
        self.claim_idle_ms = claim_idle_ms if claim_idle_ms is not None else settings.AI_CLAIM_IDLE_MS
        self.block_ms = block_ms
        self.lock_ttl_ms = lock_ttl_ms
        self.lock_wait_seconds = lock_wait_seconds
        self.backoff_base_seconds = backoff_base_seconds
        self._running: set = set()

    async def setup(self) -> None:
        try:
            await self.redis.xgroup_create(self.stream, self.group, id="0", mkstream=True)
        except ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

    async def enqueue(self, job: Dict[str, Any], attempt: int = 1) -> str:
        return await self.redis.xadd(
            self.stream, {"payload": json.dumps(job), "attempt": str(attempt)}, maxlen=10_000, approximate=True
        )

    async def drain_legacy_list(self) -> int:
        """Move jobs queued on the old Redis list into the stream."""
        if not self.legacy_list:
            return 0
        moved = 0
        while (raw := await self.redis.lpop(self.legacy_list)) is not None:
            try:
                await self.enqueue(json.loads(raw))
                moved += 1
            except ValueError:
                await self.redis.xadd(self.dead_letter, {"payload": str(raw), "error": "unreadable legacy job"})
        if moved:
            logger.info(f"[RedisConsumer] Moved {moved} job(s) from legacy list {self.legacy_list} into {self.stream}")
        return moved

    async def fetch(self, count: int) -> List[Tuple[str, Dict[str, Any]]]:
        """Jobs abandoned by a crashed worker first, then new ones."""
        entries: List[Tuple[str, Dict[str, Any]]] = []

        claimed = await self.redis.xautoclaim(
            self.stream, self.group, self.consumer, min_idle_time=self.claim_idle_ms, start_id="0-0", count=count
        )
        for entry_id, fields in (claimed[1] if claimed else []):
            if fields is None:
                continue
            pending = await self.redis.xpending_range(self.stream, self.group, min=entry_id, max=entry_id, count=1)
            deliveries = pending[0]["times_delivered"] if pending else 1
            entries.append((entry_id, {**fields, "_deliveries": deliveries}))

        remaining = count - len(entries)
        if remaining > 0:
            response = await self.redis.xreadgroup(
                self.group, self.consumer, {self.stream: ">"}, count=remaining, block=self.block_ms
            )
            for _stream, items in response or []:
                entries.extend(items)

        return entries

    async def handle_entry(self, entry_id: str, fields: Dict[str, Any]) -> None:
        attempt = int(fields.get("attempt", 1))
        try:
            try:
                job = json.loads(fields["payload"])
            except (KeyError, TypeError, ValueError):
                await self._dead_letter(fields, "unreadable payload")
                return

            # Taken over after a crash more often than allowed: it probably
            # crashes the worker itself, so stop retrying it.
            if int(fields.get("_deliveries", 1)) > self.max_attempts:
                await self._dead_letter(fields, "worker crashed while handling this job")
                return

            try:
                if await self._superseded(job):
                    logger.info(f"[RedisConsumer] Message {job.get('message_id')} superseded by a newer one; answering that instead.")
                    return
                async with self._thread_lock(job.get("thread_id")):
                    await self.handler(job)
            except Exception as e:
                if attempt < self.max_attempts:
                    logger.warning(f"[RedisConsumer] Job {entry_id} failed (attempt {attempt}/{self.max_attempts}), retrying: {e}")
                    await asyncio.sleep(self.backoff_base_seconds * attempt)
                    await self.enqueue(job, attempt + 1)
                else:
                    logger.error(f"[RedisConsumer] Job {entry_id} failed {attempt} times; moved to {self.dead_letter}: {e}", exc_info=True)
                    await self._dead_letter(fields, repr(e))
        finally:
            await self.redis.xack(self.stream, self.group, entry_id)
            await self.redis.xdel(self.stream, entry_id)

    async def _dead_letter(self, fields: Dict[str, Any], reason: str) -> None:
        clean = {k: str(v) for k, v in fields.items() if not k.startswith("_")}
        await self.redis.xadd(
            self.dead_letter,
            {**clean, "error": reason[:1000], "failed_at": datetime.now(timezone.utc).isoformat()},
            maxlen=10_000,
            approximate=True,
        )

    async def _superseded(self, job: Dict[str, Any]) -> bool:
        """After the quiet period, is there a newer customer message in this thread?

        Only text steps aside: a voice note or image still gets its own
        processing so its content is not lost.
        """
        if job.get("message_type", "text") != "text" or not job.get("thread_id") or not job.get("message_id"):
            return False

        wait = self.debounce_seconds
        queued_at = job.get("timestamp")
        if queued_at:
            try:
                age = (datetime.now(timezone.utc) - datetime.fromisoformat(str(queued_at).replace("Z", "+00:00"))).total_seconds()
                wait = min(self.debounce_seconds, max(0.0, self.debounce_seconds - age))
            except ValueError:
                pass
        if wait > 0:
            await asyncio.sleep(wait)

        latest = await self.latest_inbound_id(job["thread_id"])
        return latest is not None and str(latest) != str(job["message_id"])

    @asynccontextmanager
    async def _thread_lock(self, thread_id):
        """One job per conversation at a time, across all worker processes."""
        if not thread_id:
            yield
            return

        key = f"ai:lock:thread:{thread_id}"
        token = uuid.uuid4().hex
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self.lock_wait_seconds
        while not await self.redis.set(key, token, nx=True, px=self.lock_ttl_ms):
            if loop.time() > deadline:
                raise TimeoutError(f"conversation {thread_id} stayed busy for {self.lock_wait_seconds}s")
            await asyncio.sleep(0.2)
        try:
            yield
        finally:
            await self.redis.eval(_RELEASE_LOCK, 1, key, token)

    async def run_once(self) -> int:
        """Start as many jobs as there are free slots; returns how many started."""
        self._running = {task for task in self._running if not task.done()}
        free = self.concurrency - len(self._running)
        if free <= 0:
            await asyncio.wait(self._running, return_when=asyncio.FIRST_COMPLETED)
            return 0

        entries = await self.fetch(free)
        for entry_id, fields in entries:
            self._running.add(asyncio.create_task(self.handle_entry(entry_id, fields)))
        return len(entries)

    async def wait_idle(self) -> None:
        """Wait for every started job to finish."""
        if self._running:
            await asyncio.gather(*self._running, return_exceptions=True)
        self._running = set()

    async def run_forever(self) -> None:
        await self.setup()
        logger.info(
            f"⚡ [FastAPI Agent Worker] Consuming {self.stream} as {self.group}/{self.consumer} "
            f"(concurrency {self.concurrency}, debounce {self.debounce_seconds}s)"
        )
        while True:
            try:
                await self.drain_legacy_list()
                await self.run_once()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"❌ [RedisConsumer] Worker loop error: {e}", exc_info=True)
                await asyncio.sleep(1)


async def run_inbound_worker():
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    meta_client = MetaGraphClient()
    worker = InboundWorker(redis_client, lambda job: process_job(job, redis_client, meta_client))
    await worker.run_forever()


if __name__ == "__main__":
    asyncio.run(run_inbound_worker())
