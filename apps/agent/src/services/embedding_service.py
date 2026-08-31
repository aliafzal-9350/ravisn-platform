import logging
from typing import List, Optional
from src.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    @staticmethod
    async def generate_embedding(text: str) -> Optional[List[float]]:
        """Generate text embedding vector using OpenAI text-embedding-3-small."""
        if not text or not settings.OPENAI_API_KEY:
            return None

        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            response = await client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=text.replace("\n", " "),
                dimensions=settings.OPENAI_EMBEDDING_DIMENSIONS,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"[EmbeddingService] Failed to generate embedding: {e}")
            return None

    @staticmethod
    async def generate_batch_embeddings(texts: List[str]) -> List[List[float]]:
        """Batch embedding generation."""
        if not texts or not settings.OPENAI_API_KEY:
            return []

        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            cleaned_texts = [t.replace("\n", " ") for t in texts]
            response = await client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=cleaned_texts,
                dimensions=settings.OPENAI_EMBEDDING_DIMENSIONS,
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"[EmbeddingService] Failed batch embedding: {e}")
            return []
