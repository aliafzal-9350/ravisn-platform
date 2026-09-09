import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.deps import get_db
from src.db.models import KnowledgeBase, KnowledgeChunk
from src.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])


def split_text_into_chunks(text: str, chunk_size: int = 600, chunk_overlap: int = 80) -> List[str]:
    """Robust recursive character text splitter."""
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        return splitter.split_text(text)
    except ImportError:
        # Pure Python fallback
        if not text:
            return []
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start = end - chunk_overlap
            if start < 0:
                break
        return chunks


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    embedding_model: str = "text-embedding-3-small"


class KnowledgeChunkCreate(BaseModel):
    knowledge_base_id: str
    content: str
    metadata: Optional[dict] = None


class KnowledgeDocumentCreate(BaseModel):
    knowledge_base_id: Optional[str] = None
    title: Optional[str] = "Uploaded Document"
    content: str
    metadata: Optional[Dict[str, Any]] = None
    chunk_size: int = 600
    chunk_overlap: int = 80


@router.get("/")
async def list_knowledge_bases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase))
    kbs = result.scalars().all()
    return {"knowledge_bases": kbs}


@router.post("/")
async def create_knowledge_base(kb_in: KnowledgeBaseCreate, db: AsyncSession = Depends(get_db)):
    kb = KnowledgeBase(
        name=kb_in.name,
        description=kb_in.description,
        embedding_model=kb_in.embedding_model,
        dimension=1536
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return kb


class EmbedRequest(BaseModel):
    text: str


class KnowledgeEntryCreate(BaseModel):
    knowledge_base_id: Optional[str] = None
    question: str
    answer: str
    metadata: Optional[Dict[str, Any]] = None


class KnowledgeEntryUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/embed")
async def generate_text_embedding(req: EmbedRequest):
    """Generate 1536-dimensional vector embedding for text."""
    embedding = await EmbeddingService.generate_embedding(req.text)
    return {
        "embedding": embedding,
        "dimensions": len(embedding),
        "model": "text-embedding-3-small"
    }


@router.post("/entry")
async def create_knowledge_entry(entry_in: KnowledgeEntryCreate, db: AsyncSession = Depends(get_db)):
    """Create a Q&A knowledge entry with 1536-dimensional vector embedding."""
    kb_id = entry_in.knowledge_base_id
    if not kb_id:
        result = await db.execute(select(KnowledgeBase).limit(1))
        default_kb = result.scalars().first()
        if not default_kb:
            default_kb = KnowledgeBase(
                name="RAVISN Enterprise Knowledge Base",
                description="Primary repository for enterprise RAG retrieval",
                embedding_model="text-embedding-3-small",
                dimension=1536
            )
            db.add(default_kb)
            await db.commit()
            await db.refresh(default_kb)
        kb_id = str(default_kb.id)

    formatted_content = f"Question: {entry_in.question}\n\nAnswer: {entry_in.answer}"
    embedding_vector = await EmbeddingService.generate_embedding(formatted_content)

    meta = {
        **(entry_in.metadata or {}),
        "type": "qa",
        "question": entry_in.question,
        "answer": entry_in.answer,
        "title": entry_in.question,
        "source": "manual_entry"
    }

    chunk = KnowledgeChunk(
        knowledge_base_id=uuid.UUID(kb_id),
        content=formatted_content,
        metadata_=meta,
        embedding=embedding_vector
    )
    db.add(chunk)
    await db.commit()
    await db.refresh(chunk)

    return {
        "id": str(chunk.id),
        "knowledge_base_id": str(chunk.knowledge_base_id),
        "question": entry_in.question,
        "answer": entry_in.answer,
        "content": chunk.content,
        "created_at": chunk.created_at.isoformat() if chunk.created_at else None
    }


@router.put("/entry/{chunk_id}")
async def update_knowledge_entry(chunk_id: str, entry_in: KnowledgeEntryUpdate, db: AsyncSession = Depends(get_db)):
    """Update a Q&A knowledge entry and recalculate embedding."""
    result = await db.execute(select(KnowledgeChunk).where(KnowledgeChunk.id == uuid.UUID(chunk_id)))
    chunk = result.scalars().first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Knowledge entry not found.")

    meta = dict(chunk.metadata_ or {})
    current_q = entry_in.question or meta.get("question", "")
    current_a = entry_in.answer or meta.get("answer", chunk.content)

    formatted_content = f"Question: {current_q}\n\nAnswer: {current_a}"
    embedding_vector = await EmbeddingService.generate_embedding(formatted_content)

    meta.update({
        **(entry_in.metadata or {}),
        "type": "qa",
        "question": current_q,
        "answer": current_a,
        "title": current_q
    })

    chunk.content = formatted_content
    chunk.metadata_ = meta
    chunk.embedding = embedding_vector

    await db.commit()
    await db.refresh(chunk)

    return {
        "id": str(chunk.id),
        "question": current_q,
        "answer": current_a,
        "updated_at": datetime.utcnow().isoformat()
    }


@router.delete("/entry/{chunk_id}")
async def delete_knowledge_entry(chunk_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a single knowledge entry chunk."""
    result = await db.execute(select(KnowledgeChunk).where(KnowledgeChunk.id == uuid.UUID(chunk_id)))
    chunk = result.scalars().first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Knowledge entry not found.")

    await db.delete(chunk)
    await db.commit()
    return {"status": "success", "message": "Entry deleted."}


@router.delete("/all/{kb_id}")
async def delete_all_knowledge_entries(kb_id: str, db: AsyncSession = Depends(get_db)):
    """Delete all knowledge chunks for a knowledge base."""
    from sqlalchemy import delete
    await db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.knowledge_base_id == uuid.UUID(kb_id)))
    await db.commit()
    return {"status": "success", "message": "All entries deleted."}


@router.post("/document")
@router.post("/documents")
async def ingest_document(doc_in: KnowledgeDocumentCreate, db: AsyncSession = Depends(get_db)):
    """Chunks, embeds, and stores a document in pgvector with HNSW indexing."""
    kb_id = doc_in.knowledge_base_id
    if not kb_id:
        result = await db.execute(select(KnowledgeBase).limit(1))
        default_kb = result.scalars().first()
        if not default_kb:
            default_kb = KnowledgeBase(
                name="RAVISN Enterprise Knowledge Base",
                description="Primary repository for enterprise RAG retrieval",
                embedding_model="text-embedding-3-small",
                dimension=1536
            )
            db.add(default_kb)
            await db.commit()
            await db.refresh(default_kb)
        kb_id = str(default_kb.id)

    chunks = split_text_into_chunks(doc_in.content, chunk_size=doc_in.chunk_size, chunk_overlap=doc_in.chunk_overlap)
    if not chunks:
        raise HTTPException(status_code=400, detail="Empty content provided.")

    created_chunks = []

    for i, chunk_text in enumerate(chunks):
        embedding_vector = await EmbeddingService.generate_embedding(chunk_text)
        chunk_meta = {
            **(doc_in.metadata or {}),
            "title": doc_in.title,
            "chunk_index": i,
            "total_chunks": len(chunks)
        }
        chunk = KnowledgeChunk(
            knowledge_base_id=uuid.UUID(kb_id),
            content=chunk_text,
            metadata_=chunk_meta,
            embedding=embedding_vector
        )
        db.add(chunk)
        created_chunks.append(chunk)

    await db.commit()

    return {
        "status": "success",
        "knowledge_base_id": kb_id,
        "document_title": doc_in.title,
        "chunks_indexed": len(created_chunks),
        "embedding_model": "text-embedding-3-small"
    }
