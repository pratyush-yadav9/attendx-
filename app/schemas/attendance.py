from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.attendance import AttendanceStatus

class SessionCreate(BaseModel):
    subject_id: UUID
    classroom_id: UUID
    geo_lat: float
    geo_lng: float
    allowed_radius_meters: float = 30.0
    duration_minutes: int = 60

class SessionResponse(BaseModel):
    id: UUID
    session_token: str
    geo_lat: float
    geo_lng: float
    allowed_radius_meters: float
    start_time: datetime
    end_time: datetime
    is_active: bool

    class Config:
        from_attributes = True

class MarkAttendanceRequest(BaseModel):
    session_token: str
    student_lat: float
    student_lng: float
    device_fingerprint: str
    photo_base64: Optional[str] = None

class AttendanceRecordResponse(BaseModel):
    id: UUID
    session_id: UUID
    student_id: UUID
    status: AttendanceStatus
    distance_calculated: float
    flag_reason: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
