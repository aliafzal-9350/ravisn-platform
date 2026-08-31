import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.deps import get_db
from src.db.models import KnowledgeBase, KnowledgeChunk
from src.services.embedding_service import EmbeddingService

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    embedding_model: str = "text-embedding-3-small"


class KnowledgeChunkCreate(BaseModel):
    knowledge_base_id: str
    content: str
    metadata: Optional[dict] = None


@router.get("/")
async def list_knowledge_bases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.is_active == True))
    bases = result.scalars().all()
    return [{"id": str(b.id), "name": b.name, "description": b.description} for b in bases]


@router.post("/")
async def create_knowledge_base(payload: KnowledgeBaseCreate, db: AsyncSession = Depends(get_db)):
    kb = KnowledgeBase(
        name=payload.name,
        description=payload.description,
        embedding_model=payload.embedding_model,
        dimension=1536,
        is_active=True
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return {"id": str(kb.id), "name": kb.name, "status": "created"}


@router.post("/chunks")
async def add_knowledge_chunk(payload: KnowledgeChunkCreate, db: AsyncSession = Depends(get_db)):
    embedding = await EmbeddingService.generate_embedding(payload.content)

    chunk = KnowledgeChunk(
        knowledge_base_id=uuid.UUID(payload.knowledge_base_id),
        content=payload.content,
        metadata_=payload.metadata or {},
        embedding=embedding
    )
    db.add(chunk)
    await db.commit()
    await db.refresh(chunk)
    return {"id": str(chunk.id), "knowledge_base_id": payload.knowledge_base_id, "status": "indexed"}
