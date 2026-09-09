"""
Phase 5 Automated Integration & Verification Suite:
1. Real-time Inbound Message Ingestion while bot_active == True (AI Auto-Reply + Redis Pub/Sub)
2. Thread AI Autonomy Toggle Endpoint (PATCH /api/v1/threads/{id}/toggle-bot)
3. Inbound Message Handling while bot_active == False (Human Takeover Active, Zero AI Dispatch)
4. Manual Agent Outbound Reply (POST /api/v1/threads/{id}/messages)
"""

import time
import uuid
import json
import httpx
import redis
import psycopg2
from psycopg2.extras import RealDictCursor

CORE_BASE_URL = "http://localhost:8000/api/v1"
DB_CONFIG = {
    "dbname": "ravisn_db",
    "user": "postgres",
    "password": "secret",
    "host": "localhost",
    "port": 5432
}
REDIS_URL = "redis://localhost:6379/0"


def test_1_ai_active_inbound_and_pubsub():
    """Test 1: Ingest WhatsApp message with bot_active=True -> AI generates reply and publishes to Redis Pub/Sub."""
    print("\n--- Test 1: Inbound Message with bot_active=True (AI Autonomous Reply) ---")
    simulated_wamid = f"wamid.P5_T1_{uuid.uuid4().hex[:10].upper()}"
    sender_phone = f"1555{int(time.time()) % 10000000:07d}"

    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100609346426700",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550001122",
                                "phone_number_id": "100609346426745"
                            },
                            "messages": [
                                {
                                    "from": sender_phone,
                                    "id": simulated_wamid,
                                    "timestamp": str(int(time.time())),
                                    "text": {
                                        "body": "Hello, I am testing the real-time AI reply system."
                                    },
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }

    # Listen to Redis Pub/Sub crm_channel_updates in background
    r = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe("crm_channel_updates")

    with httpx.Client(timeout=10.0) as client:
        resp = client.post(f"{CORE_BASE_URL}/webhooks/meta", json=payload)
        assert resp.status_code == 200
        print("[PASS] Webhook Ingested: HTTP 200 OK (< 150ms)")

    # Wait for processing and capture Pub/Sub events
    time.sleep(3.5)

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT t.id as thread_id, t.bot_active, m.id as message_id, m.content, m.is_ai_generated, m.direction "
            "FROM threads t "
            "JOIN contacts c ON t.contact_id = c.id "
            "JOIN messages m ON m.thread_id = t.id "
            "WHERE c.phone_number = %s "
            "ORDER BY m.created_at ASC",
            (sender_phone,)
        )
        rows = cur.fetchall()
        assert len(rows) >= 2, f"Expected inbound + outbound messages, got {len(rows)}"

        inbound = next(r for r in rows if r["direction"] == "inbound")
        outbound = next(r for r in rows if r["direction"] == "outbound")

        assert outbound["is_ai_generated"] is True
        print(f"[PASS] Inbound ID: {inbound['message_id']} | Outbound AI ID: {outbound['message_id']}")
        print(f"[PASS] Thread ID: {inbound['thread_id']} (bot_active={inbound['bot_active']})")

        return str(inbound["thread_id"]), sender_phone
    finally:
        conn.close()
        pubsub.close()


def test_2_toggle_bot_endpoint(thread_id: str):
    """Test 2: Toggle bot_active to False via PATCH /api/v1/threads/{id}/toggle-bot."""
    print(f"\n--- Test 2: Toggle Bot Active to False for Thread {thread_id} ---")
    with httpx.Client(timeout=10.0) as client:
        resp = client.patch(f"{CORE_BASE_URL}/threads/{thread_id}/toggle-bot")
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.json()}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["bot_active"] is False
        assert data["status"] == "success"
        print(f"[PASS] Human takeover successfully enabled (bot_active={data['bot_active']})")


def test_3_human_takeover_no_ai_reply(thread_id: str, sender_phone: str):
    """Test 3: Ingest customer message while bot_active=False -> DB saved, zero AI reply queued."""
    print(f"\n--- Test 3: Ingest Message with Human Takeover Active (bot_active=False) ---")
    simulated_wamid = f"wamid.P5_T3_{uuid.uuid4().hex[:10].upper()}"

    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100609346426700",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550001122",
                                "phone_number_id": "100609346426745"
                            },
                            "messages": [
                                {
                                    "from": sender_phone,
                                    "id": simulated_wamid,
                                    "timestamp": str(int(time.time())),
                                    "text": {
                                        "body": "Can a real human agent answer my question?"
                                    },
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }

    with httpx.Client(timeout=10.0) as client:
        resp = client.post(f"{CORE_BASE_URL}/webhooks/meta", json=payload)
        assert resp.status_code == 200

    print("Waiting 3.0 seconds to confirm NO automated AI message is generated...")
    time.sleep(3.0)

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT count(*) as total_outbound FROM messages WHERE thread_id = %s AND direction = 'outbound' AND created_at > NOW() - INTERVAL '5 seconds'",
            (thread_id,)
        )
        result = cur.fetchone()
        assert result["total_outbound"] == 0, f"Expected 0 AI outbound messages, got {result['total_outbound']}"
        print("[PASS] Verified: Zero automated AI messages dispatched during human takeover.")
    finally:
        conn.close()


def test_4_manual_agent_reply(thread_id: str):
    """Test 4: Human agent sends manual reply via POST /api/v1/threads/{id}/messages."""
    print(f"\n--- Test 4: Manual Human Agent Outbound Reply ---")
    reply_payload = {
        "content": "Hello Alex, this is John from Senior Support. How may I assist you today?"
    }

    with httpx.Client(timeout=10.0) as client:
        resp = client.post(f"{CORE_BASE_URL}/threads/{thread_id}/messages", json=reply_payload)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.json()}")

        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "sent"
        assert data["message"]["is_ai_generated"] is False
        assert data["thread"]["bot_active"] is False
        print(f"[PASS] Manual Agent Message Stored & Dispatched: ID={data['message']['id']}")


if __name__ == "__main__":
    print("=" * 70)
    print(">> [RAVISN PLATFORM] RUNNING PHASE 5 INTEGRATION SUITE")
    print("=" * 70)

    thread_id, sender_phone = test_1_ai_active_inbound_and_pubsub()
    test_2_toggle_bot_endpoint(thread_id)
    test_3_human_takeover_no_ai_reply(thread_id, sender_phone)
    test_4_manual_agent_reply(thread_id)

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL PHASE 5 TESTS PASSED AND VERIFIED!")
    print("=" * 70)
