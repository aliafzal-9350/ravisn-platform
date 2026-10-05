import io
import zipfile
from defusedxml.ElementTree import fromstring as safe_fromstring
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel
import pypdf
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.deps import get_db
from src.db.models import KnowledgeBase, KnowledgeChunk
from src.services.embedding_service import EmbeddingService, EmbeddingUnavailableError

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
    tenant_id: str
    name: str
    description: Optional[str] = None
    embedding_model: str = "text-embedding-3-small"


class KnowledgeDocumentCreate(BaseModel):
    tenant_id: str
    knowledge_base_id: Optional[str] = None
    title: Optional[str] = "Uploaded Document"
    content: str
    metadata: Optional[Dict[str, Any]] = None
    chunk_size: int = 600
    chunk_overlap: int = 80


class EmbedRequest(BaseModel):
    text: str


class KnowledgeEntryCreate(BaseModel):
    tenant_id: str
    knowledge_base_id: Optional[str] = None
    question: str
    answer: str
    metadata: Optional[Dict[str, Any]] = None


class KnowledgeEntryUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        raise HTTPException(status_code=404, detail=f"{label} not found.")


async def _tenant_knowledge_base(db: AsyncSession, tenant_id: str, kb_id: Optional[str]) -> KnowledgeBase:
    """The tenant's knowledge base: the one named, or its default (created on first use).

    A knowledge base owned by another tenant is reported as not found.
    """
    if kb_id:
        result = await db.execute(
            select(KnowledgeBase).where(
                KnowledgeBase.id == _parse_uuid(kb_id, "Knowledge base"),
                KnowledgeBase.tenant_id == tenant_id,
            )
        )
        kb = result.scalars().first()
        if not kb:
            raise HTTPException(status_code=404, detail="Knowledge base not found.")
        return kb

    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.tenant_id == tenant_id).limit(1))
    kb = result.scalars().first()
    if not kb:
        kb = KnowledgeBase(
            tenant_id=tenant_id,
            name="Knowledge Base",
            description="Primary repository for RAG retrieval",
            embedding_model="text-embedding-3-small",
            dimension=1536
        )
        db.add(kb)
        await db.commit()
        await db.refresh(kb)
    return kb


async def _tenant_chunk(db: AsyncSession, tenant_id: str, chunk_id: str) -> KnowledgeChunk:
    result = await db.execute(
        select(KnowledgeChunk).where(
            KnowledgeChunk.id == _parse_uuid(chunk_id, "Knowledge entry"),
            KnowledgeChunk.tenant_id == tenant_id,
        )
    )
    chunk = result.scalars().first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Knowledge entry not found.")
    return chunk


@router.get("/")
async def list_knowledge_bases(tenant_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.tenant_id == tenant_id))
    kbs = result.scalars().all()
    return {"knowledge_bases": kbs}


@router.post("/")
async def create_knowledge_base(kb_in: KnowledgeBaseCreate, db: AsyncSession = Depends(get_db)):
    kb = KnowledgeBase(
        tenant_id=kb_in.tenant_id,
        name=kb_in.name,
        description=kb_in.description,
        embedding_model=kb_in.embedding_model,
        dimension=1536
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return kb


@router.post("/embed")
async def generate_text_embedding(req: EmbedRequest):
    """Generate 1536-dimensional vector embedding for text."""
    try:
        embedding = await EmbeddingService.generate_embedding(req.text)
    except EmbeddingUnavailableError as e:
        raise HTTPException(status_code=503, detail=f"Embedding provider unavailable: {e}")

    return {
        "embedding": embedding,
        "dimensions": len(embedding),
        "model": "text-embedding-3-small"
    }


@router.post("/entry")
async def create_knowledge_entry(entry_in: KnowledgeEntryCreate, db: AsyncSession = Depends(get_db)):
    """Create a Q&A knowledge entry with 1536-dimensional vector embedding."""
    kb = await _tenant_knowledge_base(db, entry_in.tenant_id, entry_in.knowledge_base_id)

    formatted_content = f"Question: {entry_in.question}\n\nAnswer: {entry_in.answer}"
    try:
        embedding_vector = await EmbeddingService.generate_embedding(formatted_content)
    except EmbeddingUnavailableError as e:
        raise HTTPException(status_code=503, detail=f"Embedding provider unavailable: {e}")

    meta = {
        **(entry_in.metadata or {}),
        "type": "qa",
        "question": entry_in.question,
        "answer": entry_in.answer,
        "title": entry_in.question,
        "source": "manual_entry"
    }

    chunk = KnowledgeChunk(
        knowledge_base_id=kb.id,
        tenant_id=entry_in.tenant_id,
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
async def update_knowledge_entry(
    chunk_id: str,
    entry_in: KnowledgeEntryUpdate,
    tenant_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Update a Q&A knowledge entry and recalculate embedding."""
    chunk = await _tenant_chunk(db, tenant_id, chunk_id)

    meta = dict(chunk.metadata_ or {})
    current_q = entry_in.question or meta.get("question", "")
    current_a = entry_in.answer or meta.get("answer", chunk.content)

    formatted_content = f"Question: {current_q}\n\nAnswer: {current_a}"
    try:
        embedding_vector = await EmbeddingService.generate_embedding(formatted_content)
    except EmbeddingUnavailableError as e:
        raise HTTPException(status_code=503, detail=f"Embedding provider unavailable: {e}")

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
async def delete_knowledge_entry(chunk_id: str, tenant_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Delete a single knowledge entry chunk."""
    chunk = await _tenant_chunk(db, tenant_id, chunk_id)

    await db.delete(chunk)
    await db.commit()
    return {"status": "success", "message": "Entry deleted."}


@router.delete("/all/{kb_id}")
async def delete_all_knowledge_entries(kb_id: str, tenant_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Delete all knowledge chunks for one of the tenant's knowledge bases."""
    from sqlalchemy import delete
    kb = await _tenant_knowledge_base(db, tenant_id, kb_id)
    await db.execute(
        delete(KnowledgeChunk).where(
            KnowledgeChunk.knowledge_base_id == kb.id,
            KnowledgeChunk.tenant_id == tenant_id,
        )
    )
    await db.commit()
    return {"status": "success", "message": "All entries deleted."}


@router.post("/document")
@router.post("/documents")
async def ingest_document(doc_in: KnowledgeDocumentCreate, db: AsyncSession = Depends(get_db)):
    """Chunks, embeds, and stores a document in the tenant's pgvector knowledge base."""
    kb = await _tenant_knowledge_base(db, doc_in.tenant_id, doc_in.knowledge_base_id)
    kb_id = str(kb.id)

    chunks = split_text_into_chunks(doc_in.content, chunk_size=doc_in.chunk_size, chunk_overlap=doc_in.chunk_overlap)
    if not chunks:
        raise HTTPException(status_code=400, detail="Empty content provided.")

    created_chunks = []

    for i, chunk_text in enumerate(chunks):
        try:
            embedding_vector = await EmbeddingService.generate_embedding(chunk_text)
        except EmbeddingUnavailableError as e:
            # Nothing has been committed yet (db.add() only stages pending
            # rows) — raising here means zero chunks get indexed, rather
            # than silently persisting some real and some fake vectors.
            raise HTTPException(status_code=503, detail=f"Embedding provider unavailable: {e}")

        chunk_meta = {
            **(doc_in.metadata or {}),
            "title": doc_in.title,
            "chunk_index": i,
            "total_chunks": len(chunks)
        }
        chunk = KnowledgeChunk(
            knowledge_base_id=kb.id,
            tenant_id=doc_in.tenant_id,
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


@router.post("/parse-file")
async def parse_document_file(file: UploadFile = File(...)):
    """Extract clean text from uploaded .pdf, .docx, .txt, or .csv files."""
    filename = file.filename or "uploaded_file"
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    lower_name = filename.lower()
    extracted_text = ""
    page_count = 1

    try:
        if lower_name.endswith(".pdf"):
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            page_count = len(reader.pages)
            pages_text = [page.extract_text() or "" for page in reader.pages]
            extracted_text = "\n\n".join(pages_text).strip()

        elif lower_name.endswith(".docx") or lower_name.endswith(".doc"):
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                xml_content = z.read("word/document.xml")
                # defusedxml refuses external entities and entity-expansion
                # bombs regardless of the document's encoding.
                tree = safe_fromstring(xml_content)
                namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                paragraphs = []
                for p in tree.findall(".//w:p", namespaces):
                    texts = [node.text for node in p.findall(".//w:t", namespaces) if node.text]
                    if texts:
                        paragraphs.append("".join(texts))
                extracted_text = "\n\n".join(paragraphs).strip()

        elif lower_name.endswith(".txt") or lower_name.endswith(".csv"):
            extracted_text = file_bytes.decode("utf-8", errors="replace").strip()

        else:
            extracted_text = file_bytes.decode("utf-8", errors="replace").strip()

    except Exception as e:
        logger.error(f"[KnowledgeAPI] File parsing error for {filename}: {e}")
        raise HTTPException(status_code=422, detail=f"Failed to parse document: {str(e)}")

    if not extracted_text:
        raise HTTPException(status_code=422, detail="No readable text could be extracted from this document.")

    return {
        "status": "success",
        "filename": filename,
        "page_count": page_count,
        "character_count": len(extracted_text),
        "text": extracted_text,
    }

