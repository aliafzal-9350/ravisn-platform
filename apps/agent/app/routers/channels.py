from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, crud, models
from ..database import get_db
from ..auth import get_current_tenant_flexible

router = APIRouter(prefix="/channels", tags=["channels"])


@router.get("", response_model=List[schemas.ChannelConnectionOut])
def list_channel_connections(
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    return crud.get_channel_connections(db, tenant.id)


@router.post("/{connection_id}/disconnect", response_model=schemas.ChannelConnectionOut)
def disconnect_channel(
    connection_id: str,
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_current_tenant_flexible),
):
    # Check if connection_id is a channel name (facebook, instagram, whatsapp)
    if connection_id in ("facebook", "instagram", "whatsapp"):
        conns = crud.disconnect_channel_by_name(db, tenant.id, connection_id)
        if conns:
            return conns[0]
        return schemas.ChannelConnectionOut(
            id=f"disc_{connection_id}",
            channel=connection_id,
            connection_method="official_api",
            external_account_id=None,
            status="disconnected",
        )

    conn = crud.disconnect_channel_connection(db, tenant.id, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Channel connection not found")
    return conn
