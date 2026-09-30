import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class SessionStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    EXCUSED = "EXCUSED"
    LATE = "LATE"


class CorrectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ClassSession(Base):
    __tablename__ = "class_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teachers.id"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=False)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=False)
    date = Column(String(10), nullable=False)  # "YYYY-MM-DD"
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(20), default=SessionStatus.ACTIVE.value, nullable=False)
    current_qr_token = Column(String(255), nullable=True)
    qr_expires_at = Column(DateTime, nullable=True)
    allowed_radius_meters = Column(Float, default=50.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    teacher = relationship("Teacher", back_populates="class_sessions")
    subject = relationship("Subject")
    section = relationship("Section")
    semester = relationship("Semester")
    classroom = relationship("Classroom")
    attendance_records = relationship("AttendanceRecord", back_populates="class_session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_session_id = Column(String(36), ForeignKey("class_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=False)
    status = Column(String(20), default=AttendanceStatus.PRESENT.value, nullable=False)
    verification_method = Column(String(50), default="DYNAMIC_QR", nullable=False)
    
    photo_path = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    distance_meters = Column(Float, nullable=True)
    is_geofence_verified = Column(Boolean, default=False, nullable=False)
    wifi_ssid = Column(String(100), nullable=True)
    is_wifi_verified = Column(Boolean, default=False, nullable=False)
    device_fingerprint = Column(String(255), nullable=True)
    
    marked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("class_session_id", "student_id", name="uq_session_student_attendance"),
    )

    class_session = relationship("ClassSession", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")
    subject = relationship("Subject")
    semester = relationship("Semester")


class AttendanceCorrectionRequest(Base):
    __tablename__ = "attendance_correction_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    class_session_id = Column(String(36), ForeignKey("class_sessions.id"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    requested_status = Column(String(20), default=AttendanceStatus.PRESENT.value, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default=CorrectionStatus.PENDING.value, nullable=False)  # PENDING, APPROVED, REJECTED
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewer_comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="correction_requests")
    class_session = relationship("ClassSession")
    subject = relationship("Subject")
    reviewer = relationship("User")


class SemesterPromotion(Base):
    __tablename__ = "semester_promotions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    from_semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=False)
    to_semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=False)
    promoted_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    final_attendance_percentage = Column(Float, nullable=False)
    promotion_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student")
    from_semester = relationship("Semester", foreign_keys=[from_semester_id])
    to_semester = relationship("Semester", foreign_keys=[to_semester_id])
    promoter = relationship("User")
