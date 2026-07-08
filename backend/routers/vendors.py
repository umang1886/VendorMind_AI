from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import crud, models, schemas, database, auth

router = APIRouter(
    prefix="/vendors",
    tags=["vendors"]
)

@router.get("/", response_model=List[schemas.VendorResponse])
def read_vendors(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    vendors = crud.get_vendors(db, current_user.company_id)
    return vendors

@router.post("/", response_model=schemas.VendorResponse)
def create_vendor(vendor: schemas.VendorCreate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(auth.get_current_admin_user)):
    return crud.create_vendor(db, vendor, current_admin.company_id)

@router.get("/{vendor_id}", response_model=schemas.VendorResponse)
def read_vendor(vendor_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    vendor = crud.get_vendor(db, vendor_id, current_user.company_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.put("/{vendor_id}", response_model=schemas.VendorResponse)
def update_vendor(vendor_id: str, vendor: schemas.VendorUpdate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(auth.get_current_admin_user)):
    db_vendor = crud.update_vendor(db, vendor_id, current_admin.company_id, vendor)
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return db_vendor
