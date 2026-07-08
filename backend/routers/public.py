from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
import crud, models, schemas, database
from datetime import datetime, timezone
import os
import shutil

router = APIRouter(
    prefix="/public",
    tags=["public"]
)

@router.get("/quotation/{token}")
def get_quotation_info(token: str, db: Session = Depends(database.get_db)):
    rfq_vendor = db.query(models.RFQVendor).filter(models.RFQVendor.submission_token == token).first()
    
    if not rfq_vendor:
        raise HTTPException(status_code=404, detail="Invalid token")
        
    if rfq_vendor.status == models.RFQVendorStatusEnum.submitted:
        raise HTTPException(status_code=400, detail="Quotation already submitted")
        
    if rfq_vendor.status == models.RFQVendorStatusEnum.expired or rfq_vendor.token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
        
    rfq = db.query(models.RFQ).filter(models.RFQ.id == rfq_vendor.rfq_id).first()
    vendor = db.query(models.Vendor).filter(models.Vendor.id == rfq_vendor.vendor_id).first()
    company = db.query(models.Company).filter(models.Company.id == rfq.company_id).first()
    
    return {
        "rfq": {
            "product_name": rfq.product_name,
            "quantity": rfq.quantity,
            "specifications": rfq.specifications,
            "delivery_requirements": rfq.delivery_requirements,
            "warranty_requirements": rfq.warranty_requirements,
            "submission_deadline": rfq.submission_deadline
        },
        "vendor": {
            "name": vendor.name
        },
        "company": {
            "name": company.name
        }
    }

@router.post("/quotation/{token}/submit")
async def submit_quotation(
    token: str,
    background_tasks: BackgroundTasks,
    price: float = Form(...),
    delivery_timeline: str = Form(...),
    warranty_terms: str = Form(...),
    payment_terms: str = Form(...),
    notes: str = Form(""),
    file: UploadFile = File(None),
    db: Session = Depends(database.get_db)
):
    rfq_vendor = db.query(models.RFQVendor).filter(models.RFQVendor.submission_token == token).first()
    
    if not rfq_vendor or rfq_vendor.status in [models.RFQVendorStatusEnum.submitted, models.RFQVendorStatusEnum.expired]:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    document_url = None
    if file:
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{token}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        document_url = file_path
        
    quotation = models.Quotation(
        rfq_vendor_id=rfq_vendor.id,
        price=price,
        delivery_timeline=delivery_timeline,
        warranty_terms=warranty_terms,
        payment_terms=payment_terms,
        notes=notes,
        document_url=document_url
    )
    
    rfq_vendor.status = models.RFQVendorStatusEnum.submitted
    
    db.add(quotation)
    db.commit()
    db.refresh(quotation)
    
    import ai_service
    background_tasks.add_task(ai_service.run_ai_extraction, quotation.id, db)
    
    return {"status": "success"}
