"""
RAVISN Hybrid RAG & pgvector Retrieval Benchmark
Measures: Dense Vector Search + Sparse FTS + Cross-Encoder Reranker latency.
"""

import sys
import os
import asyncio
import time
import statistics
from typing import List

# Ensure apps/agent is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "agent")))

from src.db.session import async_session_factory
from src.services.hybrid_retriever import HybridRetrieverService

SAMPLE_QUERIES = [
    "What is your enterprise pricing and SLA guarantee?",
    "How do I configure developer webhooks in RAVISN?",
    "What are your WhatsApp API message delivery limits?",
    "Do you support Instagram and Facebook Messenger channels?",
    "How does human handoff work when bot is paused?",
]


async def run_rag_benchmark():
    print("=" * 70)
    print(">> [RAVISN BENCHMARK] RUNNING HYBRID RAG & PGVECTOR RETRIEVAL SUITE")
    print(f"   Queries Tested: {len(SAMPLE_QUERIES)}")
    print("=" * 70)

    latencies: List[float] = []

    async with async_session_factory() as session:
        for idx, query in enumerate(SAMPLE_QUERIES):
            t0 = time.perf_counter()
            chunks = await HybridRetrieverService.hybrid_search(session, query, limit=3)
            duration_ms = (time.perf_counter() - t0) * 1000
            latencies.append(duration_ms)

            grade, score = HybridRetrieverService.grade_context_quality(chunks)
            print(f"  [Query {idx+1}] Latency: {duration_ms:.2f}ms | Chunks: {len(chunks)} | CRAG Grade: {grade} (Score: {score:.2f})")

    avg_ms = statistics.mean(latencies)
    p50_ms = statistics.median(latencies)
    p95_ms = latencies[int(len(latencies) * 0.95)]

    print("\n--- Hybrid RAG Benchmark Summary ---")
    print(f"Total Queries:   {len(SAMPLE_QUERIES)}")
    print(f"Average Latency: {avg_ms:.2f} ms")
    print(f"p50 Latency:     {p50_ms:.2f} ms")
    print(f"p95 Latency:     {p95_ms:.2f} ms")
    print("=" * 70)

    print("[PASS] Hybrid RAG Retrieval Benchmark Complete!")


if __name__ == "__main__":
    asyncio.run(run_rag_benchmark())
