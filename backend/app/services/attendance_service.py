import math
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.models.academic import Subject, Semester, Section, Classroom
from app.models.attendance import (
    ClassSession,
    AttendanceRecord,
    AttendanceStatus,
    SessionStatus,
    AttendanceCorrectionRequest,
)
from app.models.user import Student, User, Teacher
from app.models.config_models import CollegeLocation, SystemConfig
from app.models.notifications import Notification
from app.schemas.attendance import OverallAttendanceStats, SubjectAttendanceStats
from app.services.qr_service import QRService
from app.utils.geofence import verify_within_geofence
from app.utils.wifi_verifier import WifiVerifierService
from app.utils.image_processor import process_and_save_photo
from app.services.face_recognition_service import FaceRecognitionService


class AttendanceService:
    @staticmethod
    def get_configured_threshold(db: Session) -> float:
        threshold_config = db.query(SystemConfig).filter(
            SystemConfig.key == "ATTENDANCE_THRESHOLD"
        ).first()
        if threshold_config:
            try:
                return float(threshold_config.value)
            except ValueError:
                pass
        return settings.DEFAULT_ATTENDANCE_THRESHOLD

    @staticmethod
    def calculate_student_stats(db: Session, student_id: str) -> OverallAttendanceStats:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError("Student not found")

        threshold = AttendanceService.get_configured_threshold(db)

        # Retrieve current student semester
        current_semester = db.query(Semester).filter(Semester.id == student.semester_id).first()
        semester_num = current_semester.semester_number if current_semester else 1

        # Retrieve all subjects for the student's department and current semester
        subjects = db.query(Subject).filter(
            Subject.department_id == student.department_id,
            Subject.semester_number == semester_num
        ).all()

        subject_breakdowns: List[SubjectAttendanceStats] = []
        overall_present = 0
        overall_total = 0

        for subj in subjects:
            # Total conducted sessions for this subject in the student's section
            total_conducted = db.query(ClassSession).filter(
                ClassSession.subject_id == subj.id,
                ClassSession.section_id == student.section_id,
                ClassSession.status.in_([SessionStatus.ACTIVE.value, SessionStatus.CLOSED.value])
            ).count()

            # Present sessions for this student in this subject
            present_count = db.query(AttendanceRecord).join(ClassSession).filter(
                AttendanceRecord.student_id == student.id,
                ClassSession.subject_id == subj.id,
                AttendanceRecord.status == AttendanceStatus.PRESENT.value
            ).count()

            percentage = round((present_count / total_conducted * 100), 1) if total_conducted > 0 else 100.0

            # Calculate classes needed to reach threshold:
            # (P + x) / (T + x) >= R  ==>  x >= (R*T - P) / (1 - R)
            classes_needed = 0
            req_ratio = threshold / 100.0
            if total_conducted > 0 and percentage < threshold:
                if req_ratio < 1.0:
                    needed = math.ceil((req_ratio * total_conducted - present_count) / (1.0 - req_ratio))
                    classes_needed = max(0, needed)
                else:
                    classes_needed = 999  # Cannot reach 100% if missed any

            status_label = "healthy"
            if percentage < threshold:
                status_label = "critical"
            elif percentage < threshold + 5.0:
                status_label = "warning"

            subject_breakdowns.append(
                SubjectAttendanceStats(
                    subject_id=subj.id,
                    subject_code=subj.code,
                    subject_name=subj.name,
                    present=present_count,
                    total=total_conducted,
                    percentage=percentage,
                    required_percentage=threshold,
                    status=status_label,
                    classes_needed_to_reach_threshold=classes_needed
                )
            )

            overall_present += present_count
            overall_total += total_conducted

        overall_percentage = round((overall_present / overall_total * 100), 1) if overall_total > 0 else 100.0
        
        overall_shortage = 0
        req_ratio = threshold / 100.0
        if overall_total > 0 and overall_percentage < threshold and req_ratio < 1.0:
            overall_shortage = max(0, math.ceil((req_ratio * overall_total - overall_present) / (1.0 - req_ratio)))

        overall_status = "Healthy Attendance"
        if overall_percentage < threshold:
            overall_status = "Low Attendance"
        elif overall_percentage < threshold + 5.0:
            overall_status = "Warning"

        return OverallAttendanceStats(
            present=overall_present,
            total=overall_total,
            percentage=overall_percentage,
            required_percentage=threshold,
            status=overall_status,
            shortage_classes=overall_shortage,
            subject_breakdown=subject_breakdowns
        )

    @staticmethod
    def mark_attendance(
        db: Session,
        student: Student,
        qr_token: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        photo_base64: Optional[str] = None,
        device_fingerprint: Optional[str] = None,
        wifi_ssid: Optional[str] = None,
        face_verified: Optional[bool] = False,
        face_confidence: Optional[float] = None,
        face_verification_token: Optional[str] = None
    ) -> AttendanceRecord:
        """
        Comprehensive anti-proxy attendance verification.
        Validates:
        1. Token validity, expiration, active class session.
        2. Student eligibility (semester, section match).
        3. Duplicate attendance prevention.
        4. Geofence radius verification (Haversine formula).
        5. Wi-Fi network verification interface.
        6. Facial Recognition biometric verification.
        7. Photo capture validation & storage.
        """
        # 1. Validate QR Token
        is_valid, session, err = QRService.validate_session_token(db, qr_token)
        if not is_valid or not session:
            raise ValueError(err or "Invalid attendance token.")

        # 2. Check Semester and Section Match
        if student.semester_id != session.semester_id:
            raise ValueError("Student does not belong to the semester for this class session.")

        if student.section_id != session.section_id:
            raise ValueError("Student does not belong to the assigned section for this class session.")

        # 3. Prevent Duplicate Attendance
        existing_record = db.query(AttendanceRecord).filter(
            AttendanceRecord.class_session_id == session.id,
            AttendanceRecord.student_id == student.id
        ).first()
        if existing_record:
            raise ValueError("Attendance has already been marked for this class session.")

        # 4. Geofence Verification
        is_geofence_verified = False
        distance_meters = None

        # Fetch active college location
        active_location = db.query(CollegeLocation).filter(
            CollegeLocation.is_active == True
        ).first()

        allowed_radius = getattr(session, "allowed_radius_meters", None)
        if active_location or allowed_radius:
            if latitude is None or longitude is None:
                raise ValueError("Location permission is required to verify campus presence.")

            target_lat = active_location.latitude if active_location else settings.COLLEGE_LATITUDE
            target_lon = active_location.longitude if active_location else settings.COLLEGE_LONGITUDE
            effective_radius = allowed_radius if allowed_radius is not None else (active_location.radius_meters if active_location else 50.0)

            is_in_bounds, dist = verify_within_geofence(
                student_lat=latitude,
                student_lon=longitude,
                target_lat=target_lat,
                target_lon=target_lon,
                allowed_radius_meters=effective_radius
            )
            distance_meters = dist
            if not is_in_bounds:
                raise ValueError(
                    f"You are outside the allowed college attendance area. "
                    f"Distance: {int(dist)}m. Allowed radius: {int(effective_radius)}m."
                )

            is_geofence_verified = True
        else:
            is_geofence_verified = True  # If no location rule active, allow


        # 5. Wi-Fi Verification
        wifi_result = WifiVerifierService.verify_network(db, reported_ssid=wifi_ssid)
        if not wifi_result.is_verified and wifi_result.status_code == "UNMATCHED_NETWORK":
            raise ValueError(wifi_result.message)

        # 6. Facial Recognition & Biometric Photo Verification
        photo_url = None
        if photo_base64:
            # Check if pre-verified by facial recognition scan
            valid_token = False
            if face_verification_token and face_verification_token.startswith(f"FACE_VERIFIED:{student.registration_number}:"):
                valid_token = True

            # If not pre-verified or token absent, run instant face comparison against student profile
            if not valid_token and not face_verified:
                face_check = FaceRecognitionService.verify_face_against_database(
                    db=db,
                    photo_base64=photo_base64,
                    registration_number=student.registration_number,
                    session_id=session.id
                )
                if not face_check["is_match"]:
                    raise ValueError(
                        face_check.get("message") or 
                        f"Face verification failed: Captured face does not match student profile for {student.user.full_name}."
                    )

            photo_url = process_and_save_photo(photo_base64, prefix=student.registration_number)
            if not photo_url:
                raise ValueError("Uploaded photo could not be validated or processed.")
        else:
            raise ValueError("A photo capture is required for anti-proxy verification.")

        # 7. Record Attendance in Database
        attendance = AttendanceRecord(
            class_session_id=session.id,
            student_id=student.id,
            subject_id=session.subject_id,
            semester_id=session.semester_id,
            status=AttendanceStatus.PRESENT.value,
            verification_method="DYNAMIC_QR_FACE_VERIFIED",
            photo_path=photo_url,
            latitude=latitude,
            longitude=longitude,
            distance_meters=distance_meters,
            is_geofence_verified=is_geofence_verified,
            wifi_ssid=wifi_result.matched_ssid or wifi_ssid,
            is_wifi_verified=wifi_result.is_verified,
            device_fingerprint=device_fingerprint,
            marked_at=datetime.utcnow()
        )
        db.add(attendance)
        db.commit()
        db.refresh(attendance)

        # 8. Check for post-marking threshold notification if needed
        # (Usually attendance increases, but if overall was low, we can check recovery)

        return attendance
