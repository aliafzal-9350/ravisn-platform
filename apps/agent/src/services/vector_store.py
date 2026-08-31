import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import KnowledgeChunk
from src.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class VectorStoreService:
    @staticmethod
    async def similarity_search(
        session: AsyncSession,
        query: str,
        limit: int = 4,
        threshold: float = 0.75
    ) -> List[Dict[str, Any]]:
        """Query knowledge chunks using pgvector cosine similarity."""
        embedding = await EmbeddingService.generate_embedding(query)
        if not embedding:
            logger.warning("[VectorStoreService] Could not generate embedding for query.")
            return []

        try:
            # Query pgvector cosine distance: 1 - cosine_distance = similarity
            # Vector cosine distance operator in pgvector is <=>
            stmt = select(
                KnowledgeChunk.id,
                KnowledgeChunk.content,
                KnowledgeChunk.metadata_,
                (1 - KnowledgeChunk.embedding.cosine_distance(embedding)).label("similarity")
            ).order_by(
                KnowledgeChunk.embedding.cosine_distance(embedding)
            ).limit(limit)

            result = await session.execute(stmt)
            rows = result.all()

            matches = []
            for row in rows:
                sim = float(row.similarity) if row.similarity is not None else 0.0
                if sim >= threshold or len(matches) == 0:  # Include top match or above threshold
                    matches.append({
                        "id": str(row.id),
                        "content": row.content,
                        "metadata": row.metadata_,
                        "similarity": sim
                    })

            return matches
        except Exception as e:
            logger.error(f"[VectorStoreService] Similarity search error: {e}")
            return []
