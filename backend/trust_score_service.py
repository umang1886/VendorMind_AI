from sqlalchemy.orm import Session
import models

def recalculate_trust_score(db: Session, vendor_id: str):
    ratings = db.query(models.VendorRating).filter(models.VendorRating.vendor_id == vendor_id).all()
    if not ratings:
        return None
    
    total_score = 0
    for r in ratings:
        # Simple average of scores mapped to 1-100 or just 1-5 scale. Let's do 1-5 scale for now.
        avg_rating = (r.delivery_score + r.quality_score + r.communication_score + r.support_score) / 4.0
        total_score += avg_rating
        
    final_score = total_score / len(ratings)
    
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if vendor:
        vendor.trust_score = round(final_score, 2)
        db.commit()
    
    return final_score
