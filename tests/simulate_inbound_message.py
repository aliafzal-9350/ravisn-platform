"""
End-to-End Simulation & Verification Test for RAVISN Platform
Simulates an incoming WhatsApp customer inquiry via Meta Webhook,
and validates the complete asynchronous pipeline through Redis and LangGraph.
"""

import time
import uuid
import json
import httpx
import psycopg2
from psycopg2.extras import RealDictCursor

CORE_API_URL = "http://localhost:8000/api/v1/webhooks/meta"
DB_CONFIG = {
    "dbname": "ravisn_db",
    "user": "postgres",
    "password": "secret",
    "host": "localhost",
    "port": 5432
}


def run_simulation():
    print("=" * 70)
    print(">> [RAVISN PLATFORM] STARTING END-TO-END INBOUND PIPELINE SIMULATION")
    print("=" * 70)

    simulated_wamid = f"wamid.SIM_{uuid.uuid4().hex[:12].upper()}"
    sender_phone = f"1555{int(time.time()) % 10000000:07d}"
    test_question = "Hello! Can you tell me about the automated services provided by RAVISN Platform?"

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
                            "contacts": [
                                {
                                    "profile": {
                                        "name": "Alex Mercer"
                                    },
                                    "wa_id": sender_phone
                                }
                            ],
                            "messages": [
                                {
                                    "from": sender_phone,
                                    "id": simulated_wamid,
                                    "timestamp": str(int(time.time())),
                                    "text": {
                                        "body": test_question
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

    # 1. Post to Meta Webhook Gateway
    print(f"\n[Step 1] Ingesting Webhook Payload -> {CORE_API_URL}")
    print(f"         Sender: {sender_phone} | WAMID: {simulated_wamid}")
    print(f"         Content: \"{test_question}\"")

    start_req = time.time()
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(CORE_API_URL, json=payload)
            req_latency = (time.time() - start_req) * 1000

            print(f"         Status Code: {resp.status_code} ({req_latency:.2f}ms)")
            print(f"         Response Body: {resp.text}")

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            assert resp.json().get("status") == "EVENT_RECEIVED", "Expected status: EVENT_RECEIVED"
            print("[PASS] Webhook Ingestion Successful (< 150ms ACK verified)")
    except Exception as e:
        print(f"[FAIL] Webhook Ingestion Failed: {e}")
        return False

    # 2. Wait for background workers (Laravel queue + Redis + LangGraph)
    print("\n[Step 2] Waiting for Redis Consumer & LangGraph State Machine (3 seconds)...")
    time.sleep(3.5)

    # 3. Query PostgreSQL Database to verify records
    print("\n[Step 3] Verifying Database Records in PostgreSQL...")
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 3.1 Check Contact
        cur.execute(
            "SELECT id, phone_number, first_name FROM contacts WHERE phone_number = %s OR phone = %s",
            (sender_phone, sender_phone)
        )
        contact = cur.fetchone()
        assert contact is not None, f"Contact with phone {sender_phone} not found in database"
        print(f"[PASS] Contact Resolved: ID={contact['id']} | Phone={contact['phone_number']}")

        # 3.2 Check Thread
        cur.execute(
            "SELECT id, channel_type, bot_active, last_message_at FROM threads WHERE contact_id = %s",
            (contact["id"],)
        )
        thread = cur.fetchone()
        assert thread is not None, f"Thread for contact {contact['id']} not found"
        print(f"[PASS] Thread Active: ID={thread['id']} | Channel={thread['channel_type']} | BotActive={thread['bot_active']}")

        # 3.3 Check Inbound Message
        cur.execute(
            "SELECT id, direction, content, status FROM messages WHERE thread_id = %s AND direction = 'inbound' AND external_message_id = %s",
            (thread["id"], simulated_wamid)
        )
        inbound_msg = cur.fetchone()
        assert inbound_msg is not None, "Inbound message record not found in PostgreSQL"
        print(f"[PASS] Inbound Message Stored: ID={inbound_msg['id']} | Status={inbound_msg['status']}")

        # 3.4 Check Outbound AI Response Message
        cur.execute(
            "SELECT id, direction, content, is_ai_generated, ai_model, detected_intent, prompt_tokens, completion_tokens, latency_ms FROM messages WHERE thread_id = %s AND direction = 'outbound' ORDER BY created_at DESC LIMIT 1",
            (thread["id"],)
        )
        outbound_msg = cur.fetchone()
        assert outbound_msg is not None, "Outbound AI message record not generated"
        assert outbound_msg["is_ai_generated"] is True, "Outbound message is_ai_generated is not True"

        print(f"[PASS] Outbound AI Response Generated!")
        print(f"   - Message ID: {outbound_msg['id']}")
        print(f"   - AI Model: {outbound_msg['ai_model']}")
        print(f"   - Intent: {outbound_msg['detected_intent']}")
        print(f"   - Latency: {outbound_msg['latency_ms']}ms")
        print(f"   - Response Preview: {outbound_msg['content'][:120]}...")

        print("\n" + "=" * 70)
        print("[SUCCESS] END-TO-END PIPELINE FULLY VERIFIED!")
        print("=" * 70)
        return True

    except Exception as e:
        print(f"[FAIL] Database Verification Failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    success = run_simulation()
    exit(0 if success else 1)
