import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)  # User ID or 'SYSTEM'
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "HOD_CREATED", "SEMESTER_PROMOTED"
    target_type = Column(String(50), nullable=False)  # "USER", "ATTENDANCE", "SEMESTER", "CONFIG"
    target_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)  # Non-sensitive JSON or description
    ip_address = Column(String(50), nullable=True)
    status = Column(String(20), default="SUCCESS", nullable=False)  # SUCCESS, FAILURE
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
