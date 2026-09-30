import hmac
import hashlib
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, Student, Teacher, Admin, RoleEnum

import bcrypt

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    # Bcrypt operates on bytes up to 72 bytes
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


# --- Dynamic QR Token Cryptographic Signing & Validation ---
def generate_dynamic_qr_token(session_id: str, expiry_seconds: Optional[int] = None) -> str:
    """
    Generates a cryptographically signed, short-lived token for an active class session.
    Format: session_id.timestamp.signature
    """
    if expiry_seconds is None:
        expiry_seconds = settings.QR_EXPIRY_SECONDS
    timestamp = int(time.time())
    payload = f"{session_id}:{timestamp}:{expiry_seconds}"
    signature = hmac.new(
        settings.QR_SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()[:16]
    return f"{payload}:{signature}"


def verify_dynamic_qr_token(token_str: str) -> tuple[bool, Optional[str], Optional[str]]:
    """
    Verifies the dynamic QR token.
    Returns: (is_valid, session_id, error_message)
    """
    try:
        parts = token_str.split(":")
        if len(parts) != 4:
            return False, None, "Malformed QR token structure."
        
        session_id, timestamp_str, expiry_str, received_sig = parts
        timestamp = int(timestamp_str)
        expiry_seconds = int(expiry_str)
        
        # Verify HMAC signature
        expected_payload = f"{session_id}:{timestamp}:{expiry_seconds}"
        expected_sig = hmac.new(
            settings.QR_SECRET_KEY.encode(),
            expected_payload.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
        
        if not hmac.compare_digest(expected_sig, received_sig):
            return False, None, "Invalid QR token signature or tampering detected."
            
        # Check token expiration
        now = int(time.time())
        if now - timestamp > expiry_seconds:
            return False, session_id, "Attendance QR code has expired. Please ask the instructor for a refreshed QR."
            
        return True, session_id, None
    except Exception as e:
        return False, None, f"QR verification error: {str(e)}"


# --- Authentication & Role Dependencies ---
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in."
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token. Please log in again."
        )
    user_id = payload.get("sub")
    email = payload.get("email")
    role = payload.get("role")

    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
    if not user and role == RoleEnum.HOD_ADMIN.value:
        # Fallback to seeded HOD admin user across serverless containers
        user = db.query(User).filter(User.role == RoleEnum.HOD_ADMIN.value).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account does not exist."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Please contact administration."
        )
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        if not payload or "sub" not in payload:
            return None
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user and payload.get("email"):
            user = db.query(User).filter(User.email == payload["email"]).first()
        return user
    except Exception:
        return None


def require_student(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, Student]:
    if current_user.role != RoleEnum.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Student privileges required."
        )
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this account."
        )
    return current_user, student


def require_teacher(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, Teacher]:
    if current_user.role != RoleEnum.TEACHER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Teacher privileges required."
        )
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        teacher = db.query(Teacher).first()
        if teacher:
            teacher.user_id = current_user.id
            db.commit()
        else:
            from app.models.academic import Department
            dept = db.query(Department).first()
            teacher = Teacher(
                user_id=current_user.id,
                employee_id="EMP-TCH-01",
                department_id=dept.id if dept else None,
                designation="Associate Professor"
            )
            db.add(teacher)
            db.commit()
    return current_user, teacher


def require_hod_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, Admin]:
    if current_user.role != RoleEnum.HOD_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: HOD / Admin privileges required."
        )
    admin = db.query(Admin).filter(Admin.user_id == current_user.id).first()
    if not admin:
        admin = db.query(Admin).first()
        if admin:
            admin.user_id = current_user.id
            db.commit()
        else:
            from app.models.academic import Department
            dept = db.query(Department).first()
            admin = Admin(
                user_id=current_user.id,
                employee_id="EMP-HOD-01",
                department_id=dept.id if dept else None,
                is_super_admin=True
            )
            db.add(admin)
            db.commit()
    return current_user, admin
