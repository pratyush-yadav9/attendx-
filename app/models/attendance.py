import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    FLAGGED = "FLAGGED"
    REJECTED = "REJECTED"

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    session_token = Column(String(64), unique=True, index=True, nullable=False)
    geo_lat = Column(Float, nullable=False)
    geo_lng = Column(Float, nullable=False)
    allowed_radius_meters = Column(Float, default=30.0, nullable=False)

    start_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("attendance_sessions.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    status = Column(SQLEnum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    distance_calculated = Column(Float, nullable=False)
    device_fingerprint = Column(String(255), nullable=False)
    photo_payload_received = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(String(500), nullable=True)

    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("AttendanceSession", back_populates="records")
