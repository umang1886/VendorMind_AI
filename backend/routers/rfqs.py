from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import crud, models, schemas, database, auth

router = APIRouter(
    prefix="/rfqs",
    tags=["rfqs"]
)

@router.get("/", response_model=List[schemas.RFQResponse])
def read_rfqs(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    return crud.get_rfqs(db, current_user.company_id)

@router.post("/", response_model=schemas.RFQResponse)
def create_rfq(rfq: schemas.RFQCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    return crud.create_rfq(db, rfq, current_user.company_id, current_user.id)

@router.get("/{rfq_id}", response_model=schemas.RFQResponse)
def read_rfq(rfq_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq

@router.get("/{rfq_id}/quotations")
def get_rfq_quotations(rfq_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    # Get all vendors invited
    rfq_vendors = db.query(models.RFQVendor).filter(models.RFQVendor.rfq_id == rfq_id).all()
    results = []
    
    for rv in rfq_vendors:
        vendor = db.query(models.Vendor).filter(models.Vendor.id == rv.vendor_id).first()
        quotation = db.query(models.Quotation).filter(models.Quotation.rfq_vendor_id == rv.id).first()
        
        results.append({
            "vendor_id": vendor.id,
            "vendor_name": vendor.name,
            "trust_score": vendor.trust_score,
            "status": rv.status,
            "quotation": quotation
        })
    return results

@router.post("/{rfq_id}/invite-vendors")

def invite_vendors(rfq_id: str, payload: schemas.InviteVendorsRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    invited = crud.invite_vendors(db, rfq_id, payload.vendor_ids, rfq)
    return {"invited_count": len(invited)}

import email_service
import logging
logger = logging.getLogger(__name__)

@router.post("/{rfq_id}/send")
def send_rfq(rfq_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    # Get all invited vendors
    rfq_vendors = db.query(models.RFQVendor).filter(
        models.RFQVendor.rfq_id == str(rfq_id)
    ).all()

    logger.info(f"[SEND RFQ] rfq_id={rfq_id} — found {len(rfq_vendors)} invited vendor(s)")

    sent_count = 0
    for rv in rfq_vendors:
        vendor = db.query(models.Vendor).filter(models.Vendor.id == rv.vendor_id).first()
        if vendor:
            logger.info(f"[SEND RFQ] Sending to vendor={vendor.name} email={vendor.email}")
            result = email_service.send_rfq_invitation(vendor.email, vendor.name, rfq.product_name, rv.submission_token)
            if result:
                sent_count += 1
                logger.info(f"[SEND RFQ] Email sent successfully to {vendor.email}")
            else:
                logger.error(f"[SEND RFQ] Failed to send email to {vendor.email}")
        else:
            logger.warning(f"[SEND RFQ] Vendor not found for vendor_id={rv.vendor_id}")
            
    rfq.status = models.RFQStatusEnum.sent
    db.commit()
    
    return {"status": "sent", "emails_dispatched": sent_count}

import hindsight_service
@router.post("/{rfq_id}/ai/recommend")
def generate_rfq_recommendation(rfq_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    rfq_vendors = db.query(models.RFQVendor).filter(models.RFQVendor.rfq_id == rfq_id).all()
    quotations = []
    hindsight_contexts = {}
    
    for rv in rfq_vendors:
        quotation = db.query(models.Quotation).filter(models.Quotation.rfq_vendor_id == rv.id).first()
        if quotation:
            quotations.append(quotation)
            context = hindsight_service.retrieve_context(rv.vendor_id)
            hindsight_contexts[rv.vendor_id] = context
            
    if not quotations:
        raise HTTPException(status_code=400, detail="No quotations submitted yet")
        
    import ai_service
    rec_data = ai_service.generate_recommendation(rfq, quotations, hindsight_contexts)
    
    # Store recommendation
    rec = models.AIRecommendation(
        rfq_id=rfq_id,
        recommended_vendor_id=rec_data.get("recommended_vendor_id"),
        reasoning=rec_data.get("reasoning"),
        negotiation_suggestions=rec_data.get("negotiation_suggestions"),
        model_used="llama-3.3-70b-versatile"
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
    
@router.post("/{rfq_id}/approve")
def approve_rfq(rfq_id: str, vendor_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    winning_vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not winning_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    rfq.status = models.RFQStatusEnum.awarded
    
    # 1. Email winning vendor & rejected vendors
    rfq_vendors = db.query(models.RFQVendor).filter(models.RFQVendor.rfq_id == rfq_id).all()
    for rv in rfq_vendors:
        v = db.query(models.Vendor).filter(models.Vendor.id == rv.vendor_id).first()
        if str(rv.vendor_id) == str(vendor_id):
            approval_html = f"""
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px;">
                <h2 style="color: #16a34a; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Contract Award Notification</h2>
                <p>Dear <strong>{v.name}</strong>,</p>
                <p>We are pleased to inform you that your quotation for <strong>{rfq.product_name}</strong> has been successfully reviewed and <strong>awarded</strong> to your company.</p>
                <p>Your proposal stood out among the submissions, and we are excited to move forward with you. A formal Purchase Order will be generated and shared with you shortly. Please begin preparations as per the terms outlined in your quotation.</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #111827;">Next Steps:</h4>
                    <ul style="margin-bottom: 0;">
                        <li>Review the upcoming Purchase Order</li>
                        <li>Acknowledge receipt of the PO once delivered</li>
                        <li>Coordinate with our procurement team for fulfillment</li>
                    </ul>
                </div>
                <p>Congratulations once again. We look forward to a successful partnership.</p>
                <p>Best regards,<br/><strong>VendorMind Procurement</strong></p>
            </div>
            """
            email_service.send_email(v.email, f"Contract Awarded: {rfq.product_name}", approval_html)
        else:
            email_service.send_email(v.email, f"Update on {rfq.product_name}", f"Dear {v.name}, unfortunately another vendor was selected.")
            
    # 2. Generate PO (mock PDF generation)
    po_terms = {"product": rfq.product_name, "quantity": rfq.quantity, "vendor": winning_vendor.name}
    po = models.PurchaseOrder(
        rfq_id=rfq_id,
        vendor_id=vendor_id,
        document_url="mock_po_document.pdf",
        terms_snapshot=po_terms
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    
from pydantic import BaseModel
class RateVendorRequest(BaseModel):
    vendor_id: str
    delivery_score: int
    quality_score: int
    communication_score: int
    support_score: int
    comments: str

import trust_score_service
@router.post("/{rfq_id}/rate-vendor")
def rate_vendor(rfq_id: str, payload: RateVendorRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    rating = models.VendorRating(
        rfq_id=rfq_id,
        vendor_id=payload.vendor_id,
        rated_by=current_user.id,
        delivery_score=payload.delivery_score,
        quality_score=payload.quality_score,
        communication_score=payload.communication_score,
        support_score=payload.support_score,
        comments=payload.comments
    )
    db.add(rating)
    db.commit()
    
    # 2. Update trust score
    trust_score_service.recalculate_trust_score(db, payload.vendor_id)
    
    # 3. Store in hindsight memory
    hindsight_service.store_event(
        vendor_id=payload.vendor_id,
        event_type="rating",
        content=f"Rated {payload.delivery_score}/5 delivery, {payload.quality_score}/5 quality. Comments: {payload.comments}"
    )
    
    return {"status": "success"}


# --- Vendor Negotiation Chatbot Endpoints ---

from pydantic import BaseModel as PydanticBaseModel

class ChatRequest(PydanticBaseModel):
    content: str

@router.get("/{rfq_id}/vendors/{vendor_id}/chat")
def get_chat_history(
    rfq_id: str,
    vendor_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Retrieve the chat message history for a specific RFQ + Vendor pair."""
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.rfq_id == rfq_id, models.ChatMessage.vendor_id == vendor_id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    return [
        {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
        for m in messages
    ]


@router.post("/{rfq_id}/vendors/{vendor_id}/chat")
def post_chat_message(
    rfq_id: str,
    vendor_id: str,
    payload: ChatRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Send a user message to the negotiation chatbot and get an AI response."""
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Load chat history for context
    history_rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.rfq_id == rfq_id, models.ChatMessage.vendor_id == vendor_id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    chat_history = [{"role": m.role, "content": m.content} for m in history_rows]

    # Save user message
    user_msg = models.ChatMessage(
        rfq_id=rfq_id,
        vendor_id=vendor_id,
        role=models.ChatMessageRoleEnum.user,
        content=payload.content
    )
    db.add(user_msg)
    db.commit()

    # Get AI response
    import ai_service
    ai_reply = ai_service.handle_chat_message(
        rfq_product=rfq.product_name,
        vendor_name=vendor.name,
        vendor_email=vendor.email,
        rfq_id=rfq_id,
        vendor_id=vendor_id,
        user_message=payload.content,
        chat_history=chat_history,
        db=db
    )

    # Save AI message
    ai_msg = models.ChatMessage(
        rfq_id=rfq_id,
        vendor_id=vendor_id,
        role=models.ChatMessageRoleEnum.assistant,
        content=ai_reply
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {
        "user_message": {"role": "user", "content": payload.content},
        "ai_response": {"id": ai_msg.id, "role": "assistant", "content": ai_reply, "created_at": ai_msg.created_at.isoformat()}
    }


@router.post("/{rfq_id}/vendors/{vendor_id}/check-replies")
def check_vendor_replies(
    rfq_id: str,
    vendor_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Check Gmail for new replies from the vendor and process them with AI.
    Returns any new AI-generated acknowledgment messages.
    """
    rfq = crud.get_rfq(db, rfq_id, current_user.company_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Get already-seen Gmail message IDs stored in chat (system messages)
    seen_rows = (
        db.query(models.ChatMessage)
        .filter(
            models.ChatMessage.rfq_id == rfq_id,
            models.ChatMessage.vendor_id == vendor_id,
            models.ChatMessage.role == models.ChatMessageRoleEnum.system
        )
        .all()
    )
    seen_ids = [m.content.split("GMAIL_MSG_ID:")[1].strip() for m in seen_rows if "GMAIL_MSG_ID:" in m.content]

    import email_service, ai_service
    replies = email_service.check_vendor_replies(
        rfq_id=rfq_id,
        vendor_id=vendor_id,
        vendor_email=vendor.email,
        seen_message_ids=seen_ids
    )

    new_messages = []
    for reply in replies:
        # Store a system marker so we don't re-process this Gmail message
        marker_msg = models.ChatMessage(
            rfq_id=rfq_id,
            vendor_id=vendor_id,
            role=models.ChatMessageRoleEnum.system,
            content=f"GMAIL_MSG_ID:{reply['message_id']}"
        )
        db.add(marker_msg)

        # Analyze the reply and post to chat as assistant
        summary = ai_service.analyze_vendor_reply(reply["body"], vendor.name)
        ai_msg = models.ChatMessage(
            rfq_id=rfq_id,
            vendor_id=vendor_id,
            role=models.ChatMessageRoleEnum.assistant,
            content=summary
        )
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)
        new_messages.append({
            "id": ai_msg.id,
            "role": "assistant",
            "content": summary,
            "created_at": ai_msg.created_at.isoformat()
        })

    return {
        "new_replies_found": len(replies),
        "new_messages": new_messages
    }
