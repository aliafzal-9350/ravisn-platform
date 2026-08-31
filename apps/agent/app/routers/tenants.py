from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, crud, models
from ..database import get_db

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("", response_model=schemas.TenantOut)
def create_tenant(payload: schemas.TenantCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Tenant).filter(models.Tenant.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already taken")
    tenant = crud.create_tenant(db, payload.name, payload.slug)
    return tenant
