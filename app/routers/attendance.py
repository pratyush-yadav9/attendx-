import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
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
