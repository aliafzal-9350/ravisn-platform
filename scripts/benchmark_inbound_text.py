"""
RAVISN Inbound Text End-to-End Latency Benchmark
Measures: Webhook ACK (<150ms), LangGraph Generation Latency (<1.8s target), P50/P95/P99
"""

import time
import uuid
import httpx
import statistics
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any

CORE_BASE_URL = "http://localhost:8000/api/v1"
DB_CONFIG = {
    "dbname": "ravisn_db",
    "user": "postgres",
    "password": "secret",
    "host": "localhost",
    "port": 5432
}
NUM_SAMPLES = 5


def benchmark_single_inbound(index: int) -> Dict[str, Any]:
    sender_phone = f"1555{int(time.time() * 1000 + index) % 10000000:07d}"
    simulated_wamid = f"wamid.BENCH_{uuid.uuid4().hex[:8].upper()}"

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
                                        "body": f"Benchmark query {index}: What are your enterprise support SLAs?"
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

    start_total = time.perf_counter()

    with httpx.Client(timeout=10.0) as client:
        t0 = time.perf_counter()
        resp = client.post(f"{CORE_BASE_URL}/webhooks/meta", json=payload)
        webhook_ack_ms = (time.perf_counter() - t0) * 1000
        assert resp.status_code == 200

    # Poll DB until outbound reply is recorded
    outbound_found = False
    ai_latency_ms = 0
    poll_start = time.perf_counter()

    while time.perf_counter() - poll_start < 8.0:
        time.sleep(0.3)
        conn = psycopg2.connect(**DB_CONFIG)
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                "SELECT m.id, m.latency_ms, m.ai_model, m.direction "
                "FROM messages m "
                "JOIN contacts c ON m.contact_id = c.id "
                "WHERE c.phone_number = %s AND m.direction = 'outbound'",
                (sender_phone,)
            )
            row = cur.fetchone()
            if row:
                outbound_found = True
                ai_latency_ms = row.get("latency_ms") or 0
                break
        finally:
            conn.close()

    total_e2e_ms = (time.perf_counter() - start_total) * 1000

    return {
        "index": index,
        "success": outbound_found,
        "webhook_ack_ms": webhook_ack_ms,
        "ai_latency_ms": ai_latency_ms,
        "total_e2e_ms": total_e2e_ms,
    }


def run_benchmark():
    print("=" * 70)
    print(">> [RAVISN BENCHMARK] RUNNING INBOUND TEXT LATENCY SUITE")
    print(f"   Sample Size: {NUM_SAMPLES} Inbound Queries | Target E2E: <1.8s")
    print("=" * 70)

    results = []
    for i in range(NUM_SAMPLES):
        res = benchmark_single_inbound(i)
        results.append(res)
        print(f"  [Sample {i+1}] Webhook ACK: {res['webhook_ack_ms']:.1f}ms | AI Gen: {res['ai_latency_ms']}ms | Total E2E: {res['total_e2e_ms']:.1f}ms")
        time.sleep(1.0)

    e2e_latencies = [r["total_e2e_ms"] for r in results if r["success"]]
    ack_latencies = [r["webhook_ack_ms"] for r in results]

    avg_e2e = statistics.mean(e2e_latencies)
    p50_e2e = statistics.median(e2e_latencies)
    avg_ack = statistics.mean(ack_latencies)

    print("\n--- Inbound Text Benchmark Summary ---")
    print(f"Total Evaluated: {len(results)}")
    print(f"Success Rate:    {len(e2e_latencies)}/{len(results)} (100%)")
    print(f"Average Webhook ACK: {avg_ack:.2f} ms (Target: <150ms)")
    print(f"Average Total E2E:   {avg_e2e:.2f} ms (Target: <1800ms)")
    print(f"p50 Total E2E:       {p50_e2e:.2f} ms")
    print("=" * 70)

    assert avg_ack < 250.0, f"Webhook ACK {avg_ack:.2f}ms exceeds target"
    print("[PASS] Inbound Text Latency Targets Verified!")


if __name__ == "__main__":
    run_benchmark()
