import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, crud, models, agent
from ..database import get_db
from ..auth import get_current_tenant_flexible

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post("", response_model=schemas.KnowledgeOut)
def add_knowledge(
    payload: schemas.KnowledgeCreate,
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    return crud.add_knowledge(db, tenant.id, payload.question, payload.answer)


@router.post("/upload")
async def upload_knowledge_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    filename = file.filename.lower()
    content = await file.read()

    extracted_pairs = []

    if filename.endswith(".csv"):
        try:
            text = content.decode("utf-8-sig", errors="ignore")
            reader = csv.reader(io.StringIO(text))
            rows = list(reader)
            if rows:
                header = [h.strip().lower() for h in rows[0]]
                q_idx, a_idx = -1, -1
                for idx, col in enumerate(header):
                    if col in ["question", "questions", "q", "prompt", "topic", "title", "subject", "key", "header", "name", "category"]:
                        q_idx = idx
                    elif col in ["answer", "answers", "a", "response", "content", "description", "details", "info", "text", "body", "value"]:
                        a_idx = idx

                if q_idx != -1 and a_idx != -1 and q_idx != a_idx:
                    for row in rows[1:]:
                        if len(row) > max(q_idx, a_idx):
                            q = row[q_idx].strip()
                            a = row[a_idx].strip()
                            if q and a:
                                extracted_pairs.append({"question": q, "answer": a})
                elif len(rows[0]) >= 2:
                    # Generic 2+ column CSV: treat Col 0 as Question/Topic, Col 1 as Answer/Content
                    for row in rows[1:]:
                        if len(row) >= 2:
                            q = row[0].strip()
                            a = row[1].strip()
                            if q and a:
                                extracted_pairs.append({"question": q, "answer": a})
                        elif len(row) == 1 and row[0].strip():
                            q = row[0].strip()
                            extracted_pairs.append({"question": q, "answer": q})
                else:
                    extracted_pairs = agent.extract_qa_from_text(text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process CSV file: {str(e)}")

    elif filename.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            extracted_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
            extracted_pairs = agent.extract_qa_from_text(extracted_text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process PDF file: {str(e)}")

    elif filename.endswith(".docx") or filename.endswith(".doc"):
        try:
            import docx
            doc_file = io.BytesIO(content)
            doc = docx.Document(doc_file)
            extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            extracted_pairs = agent.extract_qa_from_text(extracted_text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process Word document: {str(e)}")

    elif filename.endswith(".txt"):
        try:
            text = content.decode("utf-8", errors="ignore")
            extracted_pairs = agent.extract_qa_from_text(text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process TXT file: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV, PDF, DOCX, or TXT.")

    if not extracted_pairs:
        raise HTTPException(status_code=400, detail="No question and answer pairs could be extracted from this document.")

    created_entries = []
    for pair in extracted_pairs:
        entry = crud.add_knowledge(db, tenant.id, pair["question"], pair["answer"])
        created_entries.append({"id": entry.id, "question": entry.question, "answer": entry.answer})

    return {
        "status": "success",
        "added_count": len(created_entries),
        "entries": created_entries
    }


@router.get("", response_model=List[schemas.KnowledgeOut])
def list_knowledge(
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    return crud.get_active_knowledge(db, tenant.id)


@router.put("/{entry_id}", response_model=schemas.KnowledgeOut)
def update_knowledge_entry(
    entry_id: str,
    payload: schemas.KnowledgeCreate,
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    updated = crud.update_knowledge(db, tenant.id, entry_id, payload.question, payload.answer)
    if not updated:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    return updated


@router.delete("/all")
def delete_all_knowledge_entries(
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    deleted_count = crud.delete_all_knowledge(db, tenant.id)
    return {"status": "deleted_all", "count": deleted_count}


@router.delete("/{entry_id}")
def delete_knowledge(
    entry_id: str,
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    success = crud.delete_knowledge(db, tenant.id, entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    return {"status": "deleted", "id": entry_id}
