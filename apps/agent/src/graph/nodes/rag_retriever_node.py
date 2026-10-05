import logging
from src.graph.state import AgentState
from src.db.session import async_session_factory
from src.services.hybrid_retriever import HybridRetrieverService

logger = logging.getLogger(__name__)


async def rag_retriever_node(state: AgentState) -> AgentState:
    """
    Hybrid RAG Node with CRAG Context Grading:
    - Dense Vector Search (pgvector cosine similarity)
    - Sparse Full-Text Search (PostgreSQL FTS)
    - Reranker & Context Quality Grader (HIGH | MEDIUM | LOW)
    """
    query = state.get("raw_content") or ""
    if not query.strip():
        state["rag_context"] = ""
        state["telemetry"]["crag_quality"] = "NONE"
        return state

    try:
        async with async_session_factory() as session:
            chunks = await HybridRetrieverService.hybrid_search(
                session=session,
                query=query,
                tenant_id=state.get("tenant_id"),
                limit=3
            )

            grade, score = HybridRetrieverService.grade_context_quality(chunks)
            state["telemetry"]["crag_quality"] = grade
            state["telemetry"]["crag_score"] = score
            state["telemetry"]["rag_chunks_found"] = len(chunks)

            if grade in ("HIGH", "MEDIUM") and chunks:
                context_texts = [f"- {c['content']}" for c in chunks]
                state["rag_context"] = "\n".join(context_texts)

                # Record the top-cited chunk for the AI reasoning trace UI —
                # this is otherwise discarded once rag_context is flattened
                # into a plain string for the LLM prompt.
                top = chunks[0]
                top_metadata = top.get("metadata") or {}
                state["telemetry"]["cited_chunk"] = {
                    "id": top.get("id"),
                    "title": top_metadata.get("title") or top_metadata.get("question") or top_metadata.get("source"),
                    "snippet": (top.get("content") or "")[:240],
                    "score": top.get("rerank_score", top.get("composite_score", top.get("vector_score"))),
                    "source": top_metadata.get("source"),
                }

                logger.info(f"[RagRetrieverNode] CRAG Grade: {grade} (Score: {score:.2f}) | {len(chunks)} chunks utilized.")
            else:
                # LOW context quality: Avoid hallucinations, do not inject noisy context
                state["rag_context"] = ""
                logger.info(f"[RagRetrieverNode] CRAG Grade: LOW (Score: {score:.2f}) | Suppressed low-confidence context.")
    except Exception as e:
        logger.error(f"[RagRetrieverNode] Error retrieving hybrid RAG context: {e}")
        state["rag_context"] = ""
        state["telemetry"]["crag_quality"] = "ERROR"

    return state
