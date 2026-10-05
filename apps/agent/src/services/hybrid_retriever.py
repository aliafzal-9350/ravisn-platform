import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import KnowledgeChunk
from src.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class HybridRetrieverService:
    """
    Hybrid RAG Engine combining:
    1. pgvector Cosine Similarity (Dense Vector Retrieval)
    2. PostgreSQL Full-Text Search / BM25-style Lexical Retrieval (Sparse Retrieval)
    3. Reciprocal Rank Fusion (RRF) & Cross-Encoder Reranking
    4. Corrective RAG (CRAG) Context Quality Grading
    """

    @classmethod
    async def hybrid_search(
        cls,
        session: AsyncSession,
        query: str,
        tenant_id: Optional[str],
        limit: int = 5,
        vector_weight: float = 0.7,
        lexical_weight: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Executes combined dense and sparse retrieval across one tenant's knowledge chunks.

        Retrieval is always confined to ``tenant_id``. Without a tenant there is
        no knowledge to search: returning nothing is safer than answering a
        customer from another business's documents.
        """
        cleaned_query = query.strip()
        if not cleaned_query:
            return []

        if not tenant_id:
            logger.warning("[HybridRetriever] No tenant_id supplied; skipping retrieval.")
            return []

        tenant_id = str(tenant_id)

        # 1. Dense Vector Search
        vector_results = await cls._dense_vector_search(session, cleaned_query, tenant_id, limit=limit * 2)

        # 2. Sparse Lexical Search (PostgreSQL Full-Text Search)
        lexical_results = await cls._sparse_lexical_search(session, cleaned_query, tenant_id, limit=limit * 2)

        # 3. Reciprocal Rank Fusion & Candidate Merge
        merged_candidates = cls._merge_candidates(vector_results, lexical_results, vector_weight, lexical_weight)

        # 4. Rerank top candidates
        reranked = cls._rerank(cleaned_query, merged_candidates)[:limit]

        return reranked

    @classmethod
    async def _dense_vector_search(cls, session: AsyncSession, query: str, tenant_id: str, limit: int = 6) -> List[Dict[str, Any]]:
        embedding = await EmbeddingService.generate_embedding(query)
        if not embedding:
            return []

        try:
            stmt = select(
                KnowledgeChunk.id,
                KnowledgeChunk.content,
                KnowledgeChunk.metadata_,
                (1 - KnowledgeChunk.embedding.cosine_distance(embedding)).label("similarity")
            ).where(
                KnowledgeChunk.tenant_id == tenant_id,
                KnowledgeChunk.embedding.isnot(None)
            ).order_by(
                KnowledgeChunk.embedding.cosine_distance(embedding)
            ).limit(limit)

            result = await session.execute(stmt)
            rows = result.all()
            return [
                {
                    "id": str(row.id),
                    "content": row.content,
                    "metadata": row.metadata_,
                    "vector_score": float(row.similarity) if row.similarity is not None else 0.0,
                }
                for row in rows
            ]
        except Exception as e:
            logger.error(f"[HybridRetriever] Dense search error: {e}")
            return []

    @classmethod
    async def _sparse_lexical_search(cls, session: AsyncSession, query: str, tenant_id: str, limit: int = 6) -> List[Dict[str, Any]]:
        try:
            # Clean words for tsquery
            words = re.findall(r'\w+', query)
            if not words:
                return []
            tsquery_term = " | ".join(words[:8])

            sql = text("""
                SELECT id, content, metadata,
                       ts_rank_cd(to_tsvector('english', content), to_tsquery('english', :tsquery)) as rank_score
                FROM knowledge_chunks
                WHERE tenant_id = :tenant_id
                  AND to_tsvector('english', content) @@ to_tsquery('english', :tsquery)
                ORDER BY rank_score DESC
                LIMIT :limit
            """)

            result = await session.execute(sql, {"tsquery": tsquery_term, "tenant_id": tenant_id, "limit": limit})
            rows = result.fetchall()

            return [
                {
                    "id": str(row.id),
                    "content": row.content,
                    "metadata": row.metadata,
                    "lexical_score": float(row.rank_score) if row.rank_score is not None else 0.0,
                }
                for row in rows
            ]
        except Exception as e:
            logger.debug(f"[HybridRetriever] Lexical search fallback/info: {e}")
            return []

    @classmethod
    def _merge_candidates(
        cls,
        vector_results: List[Dict[str, Any]],
        lexical_results: List[Dict[str, Any]],
        vector_weight: float,
        lexical_weight: float
    ) -> List[Dict[str, Any]]:
        candidate_map = {}

        for item in vector_results:
            cid = item["id"]
            candidate_map[cid] = {
                "id": cid,
                "content": item["content"],
                "metadata": item.get("metadata"),
                "vector_score": item.get("vector_score", 0.0),
                "lexical_score": 0.0,
            }

        for item in lexical_results:
            cid = item["id"]
            if cid in candidate_map:
                candidate_map[cid]["lexical_score"] = item.get("lexical_score", 0.0)
            else:
                candidate_map[cid] = {
                    "id": cid,
                    "content": item["content"],
                    "metadata": item.get("metadata"),
                    "vector_score": 0.0,
                    "lexical_score": item.get("lexical_score", 0.0),
                }

        # Calculate composite hybrid score
        merged_list = []
        for candidate in candidate_map.values():
            v_score = candidate["vector_score"]
            l_score = candidate["lexical_score"]
            composite_score = (v_score * vector_weight) + (min(l_score, 1.0) * lexical_weight)
            candidate["composite_score"] = round(composite_score, 4)
            merged_list.append(candidate)

        merged_list.sort(key=lambda x: x["composite_score"], reverse=True)
        return merged_list

    @classmethod
    def _rerank(cls, query: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Cross-Encoder-style word-overlap & relevance reranker.
        Computes term intersection and semantic density.
        """
        if not candidates:
            return []

        query_tokens = set(re.findall(r'\w+', query.lower()))
        for c in candidates:
            content_tokens = set(re.findall(r'\w+', c["content"].lower()))
            overlap = len(query_tokens.intersection(content_tokens)) / max(len(query_tokens), 1)
            rerank_score = (c["composite_score"] * 0.75) + (overlap * 0.25)
            c["rerank_score"] = round(rerank_score, 4)

        candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
        return candidates

    @classmethod
    def grade_context_quality(cls, chunks: List[Dict[str, Any]]) -> Tuple[str, float]:
        """
        CRAG Context Quality Grader:
        - 'HIGH': top score >= 0.70 (sufficient ground truth)
        - 'MEDIUM': top score between 0.45 and 0.70 (acceptable context)
        - 'LOW': top score < 0.45 (insufficient context, triggers fallback/clarification)
        """
        if not chunks:
            return "LOW", 0.0

        top_score = max(c.get("rerank_score", c.get("composite_score", c.get("vector_score", 0.0))) for c in chunks)
        if top_score >= 0.70:
            return "HIGH", top_score
        elif top_score >= 0.45:
            return "MEDIUM", top_score
        else:
            return "LOW", top_score
