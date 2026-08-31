import json
import logging
from sqlalchemy import update
from redis.asyncio import Redis
from src.graph.state import AgentState
from src.config import settings
from src.db.session import async_session_factory
from src.db.models import Thread

logger = logging.getLogger(__name__)


async def human_handoff_node(state: AgentState) -> AgentState:
    """Transitions thread to human takeover, disables bot handling, and alerts CRM agents."""
    thread_id = state.get("thread_id")
    logger.info(f"[HumanHandoffNode] Initiating Human Handoff for Thread: {thread_id}")

    state["decision"] = "handoff"
    state["final_response"] = (
        "I have alerted a member of our human support team. "
        "An agent will take over and assist you shortly."
    )
    state["telemetry"]["human_handoff"] = True

    # 1. Update Database Thread Status to human_takeover & bot_active=False
    try:
        async with async_session_factory() as session:
            stmt = (
                update(Thread)
                .where(Thread.id == thread_id)
                .values(bot_active=False, status="human_takeover")
            )
            await session.execute(stmt)
            await session.commit()
            logger.info(f"[HumanHandoffNode] Thread {thread_id} updated: bot_active=False, status=human_takeover")
    except Exception as e:
        logger.error(f"[HumanHandoffNode] Failed to update Thread in DB: {e}")

    # 2. Publish Escalation Notification to Redis Pub/Sub for CRM UI alert
    try:
        redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.publish(
            settings.CRM_BROADCAST_CHANNEL,
            json.dumps({
                "event": "HumanTakeoverRequested",
                "thread_id": thread_id,
                "contact_id": state.get("contact_id"),
                "channel": state.get("channel"),
                "reason": state.get("raw_content", "Customer requested human support"),
            })
        )
        await redis_client.aclose()
    except Exception as e:
        logger.warning(f"[HumanHandoffNode] Redis Pub/Sub broadcast skipped: {e}")

    return state
