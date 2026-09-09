import math
import hashlib
import logging
from typing import List, Optional
from src.config import settings

logger = logging.getLogger(__name__)


def _pseudo_embedding(text: str, dim: int = 1536) -> List[float]:
    """Generate a deterministic 1536-dimensional normalized vector for offline/testing RAG."""
    vec = [0.0] * dim
    words = text.lower().split()
    for word in words:
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 1.0

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    else:
        vec[0] = 1.0
    return vec


class EmbeddingService:
    @staticmethod
    async def generate_embedding(text: str) -> List[float]:
        """Generate text embedding vector using OpenAI text-embedding-3-small with fallback."""
        if not text:
            return _pseudo_embedding("empty")

        if settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, max_retries=0, timeout=4.0)

                response = await client.embeddings.create(
                    model=settings.OPENAI_EMBEDDING_MODEL,
                    input=text.replace("\n", " "),
                    dimensions=settings.OPENAI_EMBEDDING_DIMENSIONS,
                )
                return response.data[0].embedding
            except Exception as e:
                logger.warning(f"[EmbeddingService] OpenAI embedding failed: {e}. Using deterministic fallback vector.")

        return _pseudo_embedding(text, settings.OPENAI_EMBEDDING_DIMENSIONS)

    @staticmethod
    async def generate_batch_embeddings(texts: List[str]) -> List[List[float]]:
        """Batch embedding generation."""
        if not texts:
            return []

        if settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, max_retries=0, timeout=4.0)

                cleaned_texts = [t.replace("\n", " ") for t in texts]
                response = await client.embeddings.create(
                    model=settings.OPENAI_EMBEDDING_MODEL,
                    input=cleaned_texts,
                    dimensions=settings.OPENAI_EMBEDDING_DIMENSIONS,
                )
                return [item.embedding for item in response.data]
            except Exception as e:
                logger.warning(f"[EmbeddingService] OpenAI batch embedding failed: {e}. Using fallback vectors.")

        return [_pseudo_embedding(t, settings.OPENAI_EMBEDDING_DIMENSIONS) for t in texts]
