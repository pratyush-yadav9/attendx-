import os
// testing comment
//another comment
# Ensure directories exist
os.makedirs("app/schemas", exist_ok=True)
os.makedirs("app/services", exist_ok=True)
os.makedirs("app/routers", exist_ok=True)
os.makedirs("static", exist_ok=True)

# 1. Write app/schemas/attendance.py
schemas_code = """from pydantic import BaseModel
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
"""
with open("app/schemas/attendance.py", "w", encoding="utf-8") as f:
    f.write(schemas_code)

# 2. Write app/services/anti_proxy.py
services_code = """from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceStatus
from app.utils.geofence import calculate_haversine_distance

async def verify_and_record_attendance(
    db: AsyncSession,
    session_token: str,
    student_id: str,
    student_lat: float,
    student_lng: float,
    device_fingerprint: str,
    has_photo: bool = False
) -> AttendanceRecord:
    stmt = select(AttendanceSession).where(AttendanceSession.session_token == session_token)
    res = await db.execute(stmt)
    session_obj = res.scalars().first()

    if not session_obj or not session_obj.is_active:
        raise ValueError("Invalid or inactive attendance session.")

    now = datetime.now(timezone.utc)
    if now > session_obj.end_time:
        raise ValueError("Attendance session has expired.")

    dup_student_stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == session_obj.id,
        AttendanceRecord.student_id == student_id
    )
    dup_student_res = await db.execute(dup_student_stmt)
    if dup_student_res.scalars().first():
        raise ValueError("Attendance already marked for this session.")

    distance = calculate_haversine_distance(
        session_obj.geo_lat, session_obj.geo_lng,
        student_lat, student_lng
    )

    status = AttendanceStatus.PRESENT
    flag_reason = None

    if distance > session_obj.allowed_radius_meters:
        status = AttendanceStatus.FLAGGED
        flag_reason = f"Geofence violation: {distance:.2f}m exceeds allowed {session_obj.allowed_radius_meters}m"

    dup_device_stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == session_obj.id,
        AttendanceRecord.device_fingerprint == device_fingerprint
    )
    dup_device_res = await db.execute(dup_device_stmt)
    if dup_device_res.scalars().first():
        status = AttendanceStatus.FLAGGED
        reason = "Proxy detected: Device fingerprint already used by another student in this session"
        flag_reason = f"{flag_reason}; {reason}" if flag_reason else reason

    record = AttendanceRecord(
        session_id=session_obj.id,
        student_id=student_id,
        status=status,
        distance_calculated=distance,
        device_fingerprint=device_fingerprint,
        photo_payload_received=has_photo,
        flag_reason=flag_reason
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return record
"""
with open("app/services/anti_proxy.py", "w", encoding="utf-8") as f:
    f.write(services_code)

# 3. Write app/routers/attendance.py
router_code = """import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.attendance import AttendanceSession
from app.schemas.attendance import SessionCreate, SessionResponse, MarkAttendanceRequest, AttendanceRecordResponse
from app.services.anti_proxy import verify_and_record_attendance

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance & Anti-Proxy"])

@router.post("/session", response_model=SessionResponse)
async def create_session(req: SessionCreate, db: AsyncSession = Depends(get_db)):
    token = secrets.token_urlsafe(16)
    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(minutes=req.duration_minutes)

    session_obj = AttendanceSession(
        subject_id=req.subject_id,
        classroom_id=req.classroom_id,
        teacher_id="00000000-0000-0000-0000-000000000000",
        session_token=token,
        geo_lat=req.geo_lat,
        geo_lng=req.geo_lng,
        allowed_radius_meters=req.allowed_radius_meters,
        start_time=start_time,
        end_time=end_time,
        is_active=True
    )
    db.add(session_obj)
    await db.commit()
    await db.refresh(session_obj)
    return session_obj

@router.post("/mark", response_model=AttendanceRecordResponse)
async def mark_attendance(req: MarkAttendanceRequest, db: AsyncSession = Depends(get_db)):
    test_student_id = "11111111-1111-1111-1111-111111111111"
    try:
        record = await verify_and_record_attendance(
            db=db,
            session_token=req.session_token,
            student_id=test_student_id,
            student_lat=req.student_lat,
            student_lng=req.student_lng,
            device_fingerprint=req.device_fingerprint,
            has_photo=bool(req.photo_base64)
        )
        return record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
"""
with open("app/routers/attendance.py", "w", encoding="utf-8") as f:
    f.write(router_code)

# 4. Write static/index.html
html_code = """