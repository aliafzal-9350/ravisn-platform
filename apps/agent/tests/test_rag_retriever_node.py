import pytest
from unittest.mock import AsyncMock, patch
from src.graph.nodes.rag_retriever_node import rag_retriever_node


@pytest.mark.asyncio
async def test_rag_retriever_records_cited_chunk_for_high_quality_match():
    state = {
        "raw_content": "What is your refund policy?",
        "rag_context": "",
        "telemetry": {},
    }

    canned_chunks = [
        {
            "id": "chunk-1",
            "content": "Refunds are processed within 7 business days of the request.",
            "metadata": {"title": "Refund Policy", "source": "policy.txt"},
            "rerank_score": 0.88,
        },
        {
            "id": "chunk-2",
            "content": "Exchanges are handled separately from refunds.",
            "metadata": {"title": "Exchange Policy", "source": "policy.txt"},
            "rerank_score": 0.5,
        },
    ]

    with patch(
        "src.graph.nodes.rag_retriever_node.HybridRetrieverService.hybrid_search",
        new=AsyncMock(return_value=canned_chunks),
    ):
        result = await rag_retriever_node(state)

    assert result["telemetry"]["crag_quality"] == "HIGH"
    assert result["telemetry"]["rag_chunks_found"] == 2

    cited = result["telemetry"]["cited_chunk"]
    assert cited["id"] == "chunk-1"
    assert cited["title"] == "Refund Policy"
    assert cited["source"] == "policy.txt"
    assert cited["score"] == 0.88
    assert "7 business days" in cited["snippet"]


@pytest.mark.asyncio
async def test_rag_retriever_omits_cited_chunk_when_no_results():
    state = {
        "raw_content": "What is your refund policy?",
        "rag_context": "",
        "telemetry": {},
    }

    with patch(
        "src.graph.nodes.rag_retriever_node.HybridRetrieverService.hybrid_search",
        new=AsyncMock(return_value=[]),
    ):
        result = await rag_retriever_node(state)

    assert "cited_chunk" not in result["telemetry"]
    assert result["rag_context"] == ""
