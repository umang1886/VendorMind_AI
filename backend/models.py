import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float, Enum, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import enum

# Using String(36) instead of UUID for SQLite compatibility in dev mode
def generate_uuid():
    return str(uuid.uuid4())

class RoleEnum(str, enum.Enum):
    admin = "admin"
    manager = "manager"

class RFQStatusEnum(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    closed = "closed"
    awarded = "awarded"
    cancelled = "cancelled"

class RFQVendorStatusEnum(str, enum.Enum):
    invited = "invited"
    reminded = "reminded"
    submitted = "submitted"
    expired = "expired"

class Company(Base):
    __tablename__ = "companies"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"))
    email = Column(String, unique=True, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.manager)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    company = relationship("Company")

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    contact_info = Column(JSON, nullable=True)
    trust_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    company = relationship("Company")

class RFQ(Base):
    __tablename__ = "rfqs"
    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id"))
    created_by = Column(String, ForeignKey("users.id"))
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    specifications = Column(Text, nullable=True)
    delivery_requirements = Column(Text, nullable=True)
    warranty_requirements = Column(Text, nullable=True)
    submission_deadline = Column(DateTime, nullable=False)
    status = Column(Enum(RFQStatusEnum), default=RFQStatusEnum.draft)
    created_at = Column(DateTime, default=datetime.utcnow)
    company = relationship("Company")
    creator = relationship("User")

class RFQVendor(Base):
    __tablename__ = "rfq_vendors"
    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_id = Column(String, ForeignKey("rfqs.id"))
    vendor_id = Column(String, ForeignKey("vendors.id"))
    submission_token = Column(String, unique=True, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)
    status = Column(Enum(RFQVendorStatusEnum), default=RFQVendorStatusEnum.invited)
    invited_at = Column(DateTime, default=datetime.utcnow)
    rfq = relationship("RFQ")
    vendor = relationship("Vendor")

class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_vendor_id = Column(String, ForeignKey("rfq_vendors.id"))
    price = Column(Float, nullable=True)
    delivery_timeline = Column(String, nullable=True)
    warranty_terms = Column(String, nullable=True)
    payment_terms = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    document_url = Column(String, nullable=True)
    ai_extracted_data = Column(JSON, nullable=True)
    ai_risk_flags = Column(JSON, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    rfq_vendor = relationship("RFQVendor")

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_id = Column(String, ForeignKey("rfqs.id"))
    recommended_vendor_id = Column(String, ForeignKey("vendors.id"))
    comparison_summary = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    negotiation_suggestions = Column(JSON, nullable=True)
    model_used = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_id = Column(String, ForeignKey("rfqs.id"))
    vendor_id = Column(String, ForeignKey("vendors.id"))
    document_url = Column(String, nullable=True)
    terms_snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class VendorRating(Base):
    __tablename__ = "vendor_ratings"
    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_id = Column(String, ForeignKey("rfqs.id"))
    vendor_id = Column(String, ForeignKey("vendors.id"))
    rated_by = Column(String, ForeignKey("users.id"))
    delivery_score = Column(Integer, nullable=True)
    quality_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)
    support_score = Column(Integer, nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ChatMessageRoleEnum(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=generate_uuid)
    rfq_id = Column(String, ForeignKey("rfqs.id"), nullable=False)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=False)
    role = Column(Enum(ChatMessageRoleEnum), default=ChatMessageRoleEnum.user)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
