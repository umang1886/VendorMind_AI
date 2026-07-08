from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from models import RoleEnum

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: RoleEnum
    company_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class VendorBase(BaseModel):
    name: str
    email: EmailStr
    contact_info: Optional[dict] = None

class VendorCreate(VendorBase):
    pass

class VendorUpdate(VendorBase):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class VendorResponse(VendorBase):
    id: UUID
    company_id: UUID
    trust_score: Optional[float] = None
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class RFQBase(BaseModel):
    product_name: str
    quantity: int
    specifications: Optional[str] = None
    delivery_requirements: Optional[str] = None
    warranty_requirements: Optional[str] = None
    submission_deadline: datetime

class RFQCreate(RFQBase):
    pass

class RFQResponse(RFQBase):
    id: UUID
    company_id: UUID
    created_by: UUID
    status: str
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class InviteVendorsRequest(BaseModel):
    vendor_ids: list[str]

class QuotationSubmit(BaseModel):
    price: float
    delivery_timeline: str
    warranty_terms: str
    payment_terms: str
    notes: Optional[str] = None
    # document_url will be handled separately or via multipart if we had file upload
    # Since Phase 5 specifies "file upload stored in Supabase", we will use Form data in FastAPI for file upload.

