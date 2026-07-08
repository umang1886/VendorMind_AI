from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import database, auth, models

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

@router.get("/metrics")
def get_dashboard_metrics(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    company_id = current_user.company_id
    
    # 1. Total RFQs
    total_rfqs = db.query(models.RFQ).filter(models.RFQ.company_id == company_id).count()
    
    # 2. Total Vendors
    total_vendors = db.query(models.Vendor).filter(models.Vendor.company_id == company_id).count()
    
    # 3. Active RFQs (sent)
    active_rfqs = db.query(models.RFQ).filter(
        models.RFQ.company_id == company_id,
        models.RFQ.status == models.RFQStatusEnum.sent
    ).count()
    
    # 4. Top Rated Vendors
    top_vendors = db.query(models.Vendor).filter(
        models.Vendor.company_id == company_id,
        models.Vendor.trust_score.isnot(None)
    ).order_by(models.Vendor.trust_score.desc()).limit(5).all()
    
    return {
        "total_rfqs": total_rfqs,
        "total_vendors": total_vendors,
        "active_rfqs": active_rfqs,
        "top_vendors": [
            {"id": v.id, "name": v.name, "trust_score": v.trust_score}
            for v in top_vendors
        ]
    }
