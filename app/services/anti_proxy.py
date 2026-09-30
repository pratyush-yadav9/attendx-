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
    """
    Backend Security Core for AttendX:
    1. Validates proximity via Haversine formula against teacher's configured radius.
    2. Enforces a 5-minute session TTL (Time-To-Live = 300 seconds).
    3. Blocks duplicate check-ins by student ID or device fingerprint.
    """
    # 1. Fetch Session
    stmt = select(AttendanceSession).where(AttendanceSession.session_token == session_token)
    res = await db.execute(stmt)
    session_obj = res.scalars().first()

    if not session_obj or not session_obj.is_active:
        raise ValueError("Invalid or inactive attendance session.")

    now = datetime.now(timezone.utc)

    # 2. Enforce 5-minute session TTL (300 seconds from start_time)
    session_start = session_obj.start_time
    if session_start.tzinfo is None:
        session_start = session_start.replace(tzinfo=timezone.utc)

    elapsed_seconds = (now - session_start).total_seconds()
    if elapsed_seconds > 300:  # 5 minutes TTL
        raise ValueError("Attendance session has expired: 5-minute session TTL exceeded.")

    if session_obj.end_time:
        session_end = session_obj.end_time
        if session_end.tzinfo is None:
            session_end = session_end.replace(tzinfo=timezone.utc)
        if now > session_end:
            raise ValueError("Attendance session has expired.")

    # 3. Block duplicate check-ins by student
    dup_student_stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == session_obj.id,
        AttendanceRecord.student_id == student_id
    )
    dup_student_res = await db.execute(dup_student_stmt)
    if dup_student_res.scalars().first():
        raise ValueError("Attendance already marked for this session. Duplicate check-ins are blocked.")

    # 4. Block duplicate check-ins by device fingerprint
    dup_device_stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == session_obj.id,
        AttendanceRecord.device_fingerprint == device_fingerprint
    )
    dup_device_res = await db.execute(dup_device_stmt)
    if dup_device_res.scalars().first():
        raise ValueError("Proxy detected: Duplicate check-in with the same device fingerprint is blocked.")

    # 5. Proximity validation via Haversine formula against teacher's configured radius
    distance = calculate_haversine_distance(
        session_obj.geo_lat, session_obj.geo_lng,
        student_lat, student_lng
    )

    allowed_radius = getattr(session_obj, "allowed_radius_meters", 50.0) or 50.0
    if distance > allowed_radius:
        raise ValueError(
            f"Geofence violation: Distance of {distance:.1f}m exceeds teacher's configured radius of {allowed_radius:.1f}m."
        )

    # 6. Record verified attendance
    record = AttendanceRecord(
        session_id=session_obj.id,
        student_id=student_id,
        status=AttendanceStatus.PRESENT,
        distance_calculated=round(distance, 2),
        device_fingerprint=device_fingerprint,
        photo_payload_received=has_photo,
        flag_reason=None
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return record
