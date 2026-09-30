from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.attendance import ClassSession, AttendanceRecord, AttendanceStatus, SessionStatus
from app.utils.geofence import haversine_distance


class AntiProxySecurityCore:
    @staticmethod
    def verify_and_record_attendance(
        db: Session,
        session: ClassSession,
        student_id: str,
        student_lat: Optional[float],
        student_lng: Optional[float],
        device_fingerprint: str,
        has_photo: bool = False
    ) -> AttendanceRecord:
        """
        Backend Security Core:
        1. Validates proximity via Haversine formula against teacher's configured radius.
        2. Enforces a 5-minute session TTL (Time-To-Live = 300 seconds).
        3. Blocks duplicate check-ins by student ID or device fingerprint.
        """
        if not session or session.status != SessionStatus.ACTIVE.value:
            raise ValueError("Invalid or inactive attendance session.")

        now = datetime.utcnow()

        # Enforce 5-minute session TTL (300 seconds from start_time)
        session_start = session.start_time
        if (now - session_start).total_seconds() > 300:
            raise ValueError("Attendance session has expired: 5-minute session TTL exceeded.")

        if session.end_time and now > session.end_time:
            raise ValueError("Attendance session has expired.")

        # Block duplicate student check-in
        existing_student = db.query(AttendanceRecord).filter(
            AttendanceRecord.class_session_id == session.id,
            AttendanceRecord.student_id == student_id
        ).first()
        if existing_student:
            raise ValueError("Attendance already marked for this session. Duplicate check-ins are blocked.")

        # Block duplicate device fingerprint check-in
        if device_fingerprint:
            existing_device = db.query(AttendanceRecord).filter(
                AttendanceRecord.class_session_id == session.id,
                AttendanceRecord.device_fingerprint == device_fingerprint
            ).first()
            if existing_device:
                raise ValueError("Proxy detected: Duplicate check-in with the same device fingerprint is blocked.")

        # Geofence radius check against teacher's configured radius
        distance = None
        allowed_radius = getattr(session, "allowed_radius_meters", 50.0) or 50.0

        if student_lat is not None and student_lng is not None:
            # Check against classroom or college coordinates
            target_lat = getattr(session.classroom, "latitude", None) if hasattr(session, "classroom") else None
            target_lng = getattr(session.classroom, "longitude", None) if hasattr(session, "classroom") else None

            # Fallback to configured college coordinates
            if not target_lat or not target_lng:
                from app.config import settings
                target_lat = settings.COLLEGE_LATITUDE
                target_lng = settings.COLLEGE_LONGITUDE

            distance = haversine_distance(student_lat, student_lng, target_lat, target_lng)
            if distance > allowed_radius:
                raise ValueError(
                    f"Geofence violation: Distance of {distance:.1f}m exceeds teacher's configured radius of {allowed_radius:.1f}m."
                )

        record = AttendanceRecord(
            class_session_id=session.id,
            student_id=student_id,
            subject_id=session.subject_id,
            semester_id=session.semester_id,
            status=AttendanceStatus.PRESENT.value,
            distance_meters=distance,
            is_geofence_verified=True if distance is not None else False,
            device_fingerprint=device_fingerprint,
            marked_at=datetime.utcnow()
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return record
