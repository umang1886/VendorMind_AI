from sqlalchemy.orm import Session
import models, schemas
import auth

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_company(db: Session, name: str):
    db_company = models.Company(name=name)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

def create_user(db: Session, user: schemas.UserCreate, company_id: str, role: models.RoleEnum = models.RoleEnum.admin):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        company_id=company_id,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_vendors(db: Session, company_id: str):
    return db.query(models.Vendor).filter(models.Vendor.company_id == company_id).all()

def get_vendor(db: Session, vendor_id: str, company_id: str):
    return db.query(models.Vendor).filter(models.Vendor.id == vendor_id, models.Vendor.company_id == company_id).first()

def create_vendor(db: Session, vendor: schemas.VendorCreate, company_id: str):
    db_vendor = models.Vendor(
        company_id=company_id,
        name=vendor.name,
        email=vendor.email,
        contact_info=vendor.contact_info,
        trust_score=None
    )
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

def update_vendor(db: Session, vendor_id: str, company_id: str, vendor_update: schemas.VendorUpdate):
    db_vendor = get_vendor(db, vendor_id, company_id)
    if not db_vendor:
        return None
    if vendor_update.name is not None:
        db_vendor.name = vendor_update.name
    if vendor_update.email is not None:
        db_vendor.email = vendor_update.email
    if vendor_update.contact_info is not None:
        db_vendor.contact_info = vendor_update.contact_info
    db.commit()
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

def get_rfqs(db: Session, company_id: str):
    return db.query(models.RFQ).filter(models.RFQ.company_id == company_id).all()

def get_rfq(db: Session, rfq_id: str, company_id: str):
    return db.query(models.RFQ).filter(models.RFQ.id == rfq_id, models.RFQ.company_id == company_id).first()

def create_rfq(db: Session, rfq: schemas.RFQCreate, company_id: str, user_id: str):
    db_rfq = models.RFQ(
        company_id=company_id,
        created_by=user_id,
        product_name=rfq.product_name,
        quantity=rfq.quantity,
        specifications=rfq.specifications,
        delivery_requirements=rfq.delivery_requirements,
        warranty_requirements=rfq.warranty_requirements,
        submission_deadline=rfq.submission_deadline
    )
    db.add(db_rfq)
    db.commit()
    db.refresh(db_rfq)
    return db_rfq

import secrets
def invite_vendors(db: Session, rfq_id: str, vendor_ids: list[str], rfq: models.RFQ):
    invited = []
    for vid in vendor_ids:
        # Check if already invited
        existing = db.query(models.RFQVendor).filter(models.RFQVendor.rfq_id == rfq_id, models.RFQVendor.vendor_id == vid).first()
        if not existing:
            token = secrets.token_urlsafe(32)
            rfq_vendor = models.RFQVendor(
                rfq_id=rfq_id,
                vendor_id=vid,
                submission_token=token,
                token_expires_at=rfq.submission_deadline
            )
            db.add(rfq_vendor)
            invited.append(rfq_vendor)
    db.commit()
    return invited
