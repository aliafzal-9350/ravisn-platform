from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, models
from ..database import get_db
from ..auth import get_current_tenant_flexible

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=List[schemas.ConversationOut])
def list_conversations(
    channel: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    q = db.query(models.Conversation).filter(models.Conversation.tenant_id == tenant.id)
    if channel:
        q = q.filter(models.Conversation.channel == channel)
    return q.order_by(models.Conversation.last_message_at.desc()).all()


@router.get("/{conversation_id}/messages", response_model=List[schemas.MessageOut])
def list_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    convo = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id,
        models.Conversation.tenant_id == tenant.id,
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo.messages
