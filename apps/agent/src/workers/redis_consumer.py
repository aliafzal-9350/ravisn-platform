import json
import asyncio
import logging
import uuid
from datetime import datetime
from sqlalchemy import update
from redis.asyncio import Redis
from src.config import settings
from src.graph.graph import compiled_agent_graph
from src.services.meta_client import MetaGraphClient
from src.db.session import async_session_factory
from src.db.models import Message, Thread

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("redis_consumer")


async def run_inbound_worker():
    """Background Redis consumer daemon processing inbound_ai_jobs queue."""
    stream_key = settings.INBOUND_AI_STREAM_KEY
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    meta_client = MetaGraphClient()

    logger.info(f"⚡ [FastAPI Agent Worker] Listening to Redis queue: {stream_key}")

    while True:
        try:
            # Blocking pop from Redis queue (timeout 2s)
            result = await redis_client.blpop(stream_key, timeout=2)
            if not result:
                await asyncio.sleep(0.05)
                continue

            _, raw_job = result
            job_data = json.loads(raw_job)

            thread_id = job_data.get("thread_id")
            contact_id = job_data.get("contact_id")
            channel = job_data.get("channel", "whatsapp")
            sender_id = job_data.get("sender_id")
            message_type = job_data.get("message_type", "text")
            access_token = job_data.get("access_token", "")

            logger.info(f"📥 Processing AI Task for Thread: {thread_id} | Type: {message_type}")

            # 1. Execute LangGraph State Machine
            initial_state = {
                "thread_id": str(thread_id),
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
                "telemetry": {}
            }

            final_state = await compiled_agent_graph.ainvoke(initial_state)

            final_response = final_state.get("final_response")
            decision = final_state.get("decision", "reply")
            telemetry = final_state.get("telemetry", {})

            # 2. Dispatch Reply via Meta Graph API
            external_msg_id = None
            if final_response and access_token and sender_id:
                reply_result = await meta_client.send_message(
                    channel=channel,
                    recipient_id=sender_id,
                    text=final_response,
                    access_token=access_token
                )
                external_msg_id = reply_result.get("messages", [{}])[0].get("id")

            # 3. Store Outbound Message & AI Telemetry in PostgreSQL
            outbound_msg_id = str(uuid.uuid4())
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
                        status="sent" if external_msg_id else "queued",
                        is_ai_generated=True,
                        ai_model=telemetry.get("model", settings.OPENAI_CHAT_MODEL),
                        detected_intent=final_state.get("intent"),
                        prompt_tokens=telemetry.get("prompt_tokens"),
                        completion_tokens=telemetry.get("completion_tokens"),
                        latency_ms=telemetry.get("latency_ms"),
                        confidence_score=telemetry.get("confidence_score", 1.0),
                        raw_payload={"telemetry": telemetry}
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
                            "content": final_response,
                            "is_ai_generated": True,
                            "ai_model": telemetry.get("model", settings.OPENAI_CHAT_MODEL),
                            "detected_intent": final_state.get("intent"),
                            "latency_ms": telemetry.get("latency_ms"),
                            "prompt_tokens": telemetry.get("prompt_tokens"),
                            "completion_tokens": telemetry.get("completion_tokens"),
                            "created_at": datetime.utcnow().isoformat(),
                        }
                    })
                )
            except Exception as pub_err:
                logger.warning(f"[RedisConsumer] Pub/Sub broadcast skipped: {pub_err}")

        except Exception as e:
            logger.error(f"❌ [RedisConsumer] Error processing inbound job: {str(e)}", exc_info=True)
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(run_inbound_worker())
