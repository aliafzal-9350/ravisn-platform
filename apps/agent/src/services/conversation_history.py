"""Earlier turns of a conversation, so the AI answers in context instead of
treating every customer message as the first one."""
import logging
import uuid
from typing import Dict, List, Optional

from sqlalchemy import select

from src.db.models import Message
from src.db.session import async_session_factory

logger = logging.getLogger(__name__)

HISTORY_LIMIT = 10
MAX_CHARS_PER_TURN = 1000

# What the model is told when a turn had no text (media without a caption).
_PLACEHOLDERS = {
    "image": "[sent an image]",
    "audio": "[sent a voice note]",
    "voice": "[sent a voice note]",
    "video": "[sent a video]",
    "document": "[sent a document]",
    "sticker": "[sent a sticker]",
    "location": "[shared a location]",
}


async def load_history(
    thread_id: Optional[str],
    exclude_message_id: Optional[str] = None,
    limit: int = HISTORY_LIMIT,
) -> List[Dict[str, str]]:
    """The thread's last `limit` turns, oldest first, as chat messages.

    Customer messages become "user" turns and replies (AI or human agent)
    "assistant" turns. Internal staff notes and system notices are left out,
    and so is the message currently being answered.
    """
    try:
        thread_uuid = uuid.UUID(str(thread_id))
    except (TypeError, ValueError):
        return []

    try:
        async with async_session_factory() as session:
            rows = (await session.execute(
                select(Message.id, Message.direction, Message.message_type, Message.content, Message.raw_payload)
                .where(Message.thread_id == thread_uuid)
                .order_by(Message.created_at.desc())
                .limit(limit + 1)
            )).all()
    except Exception as e:
        logger.warning(f"[ConversationHistory] Could not load history for thread {thread_id}: {e}")
        return []

    turns: List[Dict[str, str]] = []
    for row in reversed(rows):
        if exclude_message_id and str(row.id) == str(exclude_message_id):
            continue
        if row.message_type == "note" or (isinstance(row.raw_payload, dict) and row.raw_payload.get("system")):
            continue

        text = (row.content or "").strip() or _PLACEHOLDERS.get(row.message_type or "", "")
        if not text:
            continue

        turns.append({
            "role": "user" if row.direction == "inbound" else "assistant",
            "content": text[:MAX_CHARS_PER_TURN],
        })

    return turns[-limit:]
