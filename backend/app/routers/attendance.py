from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.user import Student, User, RoleEnum
from app.models.attendance import AttendanceRecord, ClassSession
from app.schemas.attendance import (
    MarkAttendanceRequest,
    VerificationSessionInfo,
    FaceVerificationRequest,
    FaceVerificationResponse,
    RegisterFaceRequest,
)
from app.dependencies import (
    require_student,
    get_current_user,
    get_current_user_optional,
    verify_dynamic_qr_token,
)
from app.services.qr_service import QRService
from app.services.attendance_service import AttendanceService
from app.services.face_recognition_service import FaceRecognitionService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance Verification & Submission"])


@router.get("/verify/{token}")
def get_session_verification_info(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Called by the student's mobile attendance verification page when scanning a dynamic QR.
    Provides session metadata: Subject, Teacher, Room, Time, and verifies token validity.
    """
    is_valid, session, err = QRService.validate_session_token(db, token)
    if not is_valid or not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err or "Invalid or expired attendance QR token."
        )

    teacher_name = session.teacher.user.full_name if session.teacher and session.teacher.user else "Instructor"
    subject_name = session.subject.name if session.subject else "Class Subject"
    subject_code = session.subject.code if session.subject else ""
    room_number = session.classroom.room_number if session.classroom else "Campus Hall"
    section_name = session.section.name if session.section else ""
    semester_num = session.semester.semester_number if session.semester else 1

    return {
        "success": True,
        "data": {
            "session_id": session.id,
            "subject_name": subject_name,
            "subject_code": subject_code,
            "teacher_name": teacher_name,
            "room_number": room_number,
            "section_name": section_name,
            "semester_number": semester_num,
            "date": session.date,
            "start_time": session.start_time.strftime("%H:%M"),
            "status": session.status,
            "token_valid": True,
            "requires_photo": True,
            "requires_location": True
        }
    }


@router.post("/verify-face")
def verify_student_face(
    req: FaceVerificationRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Biometric Facial Recognition for the Photo Section:
    - Compares live photo with registered student profile photo.
    - If face matches: returns MATCH status, confidence %, student name, roll number,
      registration ID, class/section, department, and current attendance status.
    - If face does not match: returns NO_MATCH with clear feedback.
    - Protects biometric data: used strictly for attendance identification.
    """
    # If student is authenticated and no registration_number was explicitly supplied,
    # bind to authenticated student account
    reg_num = req.registration_number
    user_id = None
    if current_user and current_user.role == RoleEnum.STUDENT.value:
        user_id = current_user.id
        if not reg_num and current_user.student_profile:
            reg_num = current_user.student_profile.registration_number

    # If qr_token is passed and session_id is not, resolve session
    session_id = req.session_id
    if not session_id and req.qr_token:
        is_valid, session, _ = QRService.validate_session_token(db, req.qr_token)
        if is_valid and session:
            session_id = session.id

    try:
        result = FaceRecognitionService.verify_face_against_database(
            db=db,
            photo_base64=req.photo_base64,
            registration_number=reg_num,
            session_id=session_id,
            user_id=user_id
        )

        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Face recognition error: {str(e)}"
        )


@router.post("/register-face")
def register_student_face(
    req: RegisterFaceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Registers or updates a student's official biometric profile photo.
    Restricted to authenticated student updating their own face, or HOD / Admin.
    """
    target_student: Optional[Student] = None

    if current_user.role == RoleEnum.STUDENT.value:
        target_student = db.query(Student).filter(Student.user_id == current_user.id).first()
    elif current_user.role in (RoleEnum.HOD_ADMIN.value, RoleEnum.TEACHER.value):
        if not req.registration_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="registration_number is required for staff photo registration."
            )
        target_student = db.query(Student).filter(
            Student.registration_number == req.registration_number.strip().upper()
        ).first()

    if not target_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found."
        )

    try:
        photo_url = FaceRecognitionService.register_student_photo(
            db=db,
            student=target_student,
            photo_base64=req.photo_base64
        )
        return {
            "success": True,
            "message": f"Biometric reference photo registered successfully for {target_student.user.full_name}.",
            "data": {
                "registration_number": target_student.registration_number,
                "photo_url": photo_url
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to register photo: {str(e)}"
        )


@router.post("/mark", status_code=status.HTTP_201_CREATED)
def submit_attendance(
    data: MarkAttendanceRequest,
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Submits attendance with full anti-proxy validations:
    - Dynamic QR token verification
    - Authenticated student verification
    - Duplicate attendance check
    - Haversine geofence verification
    - Wi-Fi validation interface
    - Biometric facial recognition check
    - Live photo capture validation
    """
    user, student = auth_data

    try:
        record = AttendanceService.mark_attendance(
            db=db,
            student=student,
            qr_token=data.qr_token,
            latitude=data.latitude,
            longitude=data.longitude,
            photo_base64=data.photo_base64,
            device_fingerprint=data.device_fingerprint,
            wifi_ssid=data.wifi_ssid,
            face_verified=data.face_verified,
            face_confidence=data.face_confidence,
            face_verification_token=data.face_verification_token
        )

        AuditService.log(
            db=db,
            action="ATTENDANCE_MARKED",
            target_type="ATTENDANCE_RECORD",
            user=user,
            target_id=record.id,
            details={
                "session_id": record.class_session_id,
                "distance_meters": record.distance_meters,
                "geofence_verified": record.is_geofence_verified,
                "verification_method": record.verification_method
            }
        )

        session = record.class_session
        return {
            "success": True,
            "message": "Attendance marked successfully. Your presence and biometric identity have been securely verified.",
            "data": {
                "attendance_id": record.id,
                "student_name": user.full_name,
                "registration_number": student.registration_number,
                "subject_name": session.subject.name if session and session.subject else "",
                "subject_code": session.subject.code if session and session.subject else "",
                "teacher_name": session.teacher.user.full_name if session and session.teacher and session.teacher.user else "",
                "room_number": session.classroom.room_number if session and session.classroom else "",
                "date": session.date if session else "",
                "marked_at": record.marked_at.strftime("%Y-%m-%d %H:%M:%S"),
                "status": record.status,
                "distance_meters": record.distance_meters,
                "verification_method": record.verification_method
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record attendance due to an internal error."
        )
