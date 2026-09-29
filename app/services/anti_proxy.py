from sqlalchemy.ext.asyncio import AsyncSession
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
    # 1. Fetch Session
    stmt = select(AttendanceSession).where(AttendanceSession.session_token == session_token)
    res = await db.execute(stmt)
    session_obj = res.scalars().first()

    if not session_obj or not session_obj.is_active:
        raise ValueError("Invalid or inactive attendance session.")

    now = datetime.now(timezone.utc)
    if now > session_obj.end_time:
        raise ValueError("Attendance session has expired.")

    # 2. Check duplicate attendance by student
    dup_student_stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == session_obj.id,
        AttendanceRecord.student_id == student_id
    )
    dup_student_res = await db.execute(dup_student_stmt)
    if dup_student_res.scalars().first():
        raise ValueError("Attendance already marked for this session.")

    # 3. Geofence Distance Calculation
    distance = calculate_haversine_distance(
        session_obj.geo_lat, session_obj.geo_lng,
        student_lat, student_lng
    )

    status = AttendanceStatus.PRESENT
    flag_reason = None

    if distance > session_obj.allowed_radius_meters:
        status = AttendanceStatus.FLAGGED
        flag_reason = f"Geofence violation: {distance:.2f}m exceeds allowed {session_obj.allowed_radius_meters}m"

    # 4. Anti-Proxy Check: Duplicate device fingerprint within the same session
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
