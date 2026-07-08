import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import crud
import database
from models import RoleEnum

SECRET_KEY = os.getenv("JWT_SECRET", "super_secret_jwt_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

import bcrypt

def verify_password(plain_password, hashed_password):
    password_byte_enc = plain_password.encode('utf-8')
    # If the password is > 72 bytes, we truncate to avoid bcrypt errors
    if len(password_byte_enc) > 72:
        password_byte_enc = password_byte_enc[:72]
    
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)
    except ValueError:
        return False

def get_password_hash(password):
    pwd_bytes = password.encode('utf-8')
    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]
    
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user = Depends(get_current_user)):
    return current_user

async def get_current_admin_user(current_user = Depends(get_current_active_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
