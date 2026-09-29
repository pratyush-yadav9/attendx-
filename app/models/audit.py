import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.attendance import AttendanceStatus

class AttendanceOverrideLog(Base):
    __tablename__ = "attendance_override_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("attendance_records.id"), nullable=False)
    changed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    previous_status = Column(SQLEnum(AttendanceStatus), nullable=False)
    new_status = Column(SQLEnum(AttendanceStatus), nullable=False)
    reason = Column(String(500), nullable=False)

    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    record = relationship("AttendanceRecord")
    changed_by = relationship("User")
