import logging
from src.graph.state import AgentState
from src.db.session import async_session_factory
from src.services.vector_store import VectorStoreService

logger = logging.getLogger(__name__)


async def rag_retriever_node(state: AgentState) -> AgentState:
    """Queries knowledge base embeddings via pgvector cosine similarity with HNSW index."""
    query = state.get("raw_content") or ""
    if not query.strip():
        state["rag_context"] = ""
        return state

    try:
        async with async_session_factory() as session:
            chunks = await VectorStoreService.similarity_search(
                session=session,
                query=query,
                limit=3,
                threshold=0.65
            )

            if chunks:
                context_texts = [f"- {c['content']}" for c in chunks]
                state["rag_context"] = "\n".join(context_texts)
                state["telemetry"]["rag_chunks_found"] = len(chunks)
                logger.info(f"[RagRetrieverNode] Retrieved {len(chunks)} relevant context chunks.")
            else:
                state["rag_context"] = ""
                state["telemetry"]["rag_chunks_found"] = 0
    except Exception as e:
        logger.error(f"[RagRetrieverNode] Error retrieving RAG context: {e}")
        state["rag_context"] = ""

    return state
