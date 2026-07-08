from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import crud, models, schemas, database, auth

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create company first
    company = crud.create_company(db, name=user.company_name)
    
    # Create user as admin of that company
    new_user = crud.create_user(db, user, company.id, role=models.RoleEnum.admin)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user
