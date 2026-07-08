try:
    from apscheduler.schedulers.background import BackgroundScheduler
except ImportError:
    class BackgroundScheduler:
        def add_job(self, *args, **kwargs): pass
        def start(self): pass
        def shutdown(self): pass
from sqlalchemy.orm import Session
from datetime import datetime
import models, database, email_service
import logging

logger = logging.getLogger(__name__)

def check_deadlines():
    db = database.SessionLocal()
    try:
        now = datetime.utcnow()
        # Find RFQs that are past deadline and not yet closed
        expired_rfqs = db.query(models.RFQ).filter(
            models.RFQ.submission_deadline <= now,
            models.RFQ.status.in_([models.RFQStatusEnum.sent])
        ).all()
        
        for rfq in expired_rfqs:
            rfq.status = models.RFQStatusEnum.closed
            # Expire all pending vendors
            pending_vendors = db.query(models.RFQVendor).filter(
                models.RFQVendor.rfq_id == rfq.id,
                models.RFQVendor.status.in_([models.RFQVendorStatusEnum.invited, models.RFQVendorStatusEnum.reminded])
            ).all()
            
            for pv in pending_vendors:
                pv.status = models.RFQVendorStatusEnum.expired
                
            logger.info(f"Closed RFQ {rfq.id} and expired {len(pending_vendors)} vendors.")
            
        db.commit()
    except Exception as e:
        logger.error(f"Error checking deadlines: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_deadlines, 'interval', minutes=5)
    scheduler.start()
    return scheduler
