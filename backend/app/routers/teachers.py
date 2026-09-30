from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional
from urllib.parse import urlparse

from app.database import get_db
from app.models.user import Teacher, User, Student
from app.models.academic import Subject, Section, Semester, Classroom, TimetableSlot, TeacherSubjectAssignment
from app.models.attendance import (
    ClassSession,
    AttendanceRecord,
    AttendanceCorrectionRequest,
    SessionStatus,
    AttendanceStatus,
    CorrectionStatus,
)
from app.schemas.attendance import (
    StartSessionRequest,
    ClassSessionResponse,
    AttendanceCorrectionReview,
)
from app.dependencies import require_teacher
from app.services.qr_service import QRService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/v1/teachers", tags=["Teacher Features"])


def get_request_base_url(request: Request, passed_url: Optional[str] = None) -> Optional[str]:
    """Helper to detect frontend origin from request or query parameter."""
    if passed_url and passed_url.strip().startswith("http"):
        return passed_url.strip().rstrip("/")
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        p = urlparse(origin)
        if p.scheme and p.netloc:
            return f"{p.scheme}://{p.netloc}"
    return None


@router.get("/dashboard")
def get_teacher_dashboard(
    request: Request,
    base_url: Optional[str] = Query(None),
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Returns teacher profile, assigned subjects/sections, and today's scheduled classes.
    """
    user, teacher = auth_data
    today_date_str = date.today().strftime("%Y-%m-%d")
    today_day_name = date.today().strftime("%A")

    # Assigned subjects
    assignments = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher.id
    ).all()

    assigned_subjects = [
        {
            "id": a.id,
            "subject_id": a.subject_id,
            "subject_name": a.subject.name if a.subject else "",
            "subject_code": a.subject.code if a.subject else "",
            "section_id": a.section_id,
            "section_name": a.section.name if a.section else "",
            "semester_id": a.semester_id,
            "semester_number": a.semester.semester_number if a.semester else 1
        }
        for a in assignments
    ]

    # Today's scheduled classes from timetable
    slots = db.query(TimetableSlot).filter(
        TimetableSlot.teacher_id == teacher.id,
        TimetableSlot.day_of_week == today_day_name
    ).order_by(TimetableSlot.start_time).all()

    # Auto-close any sessions from past dates that were left open
    today_date_str = date.today().strftime("%Y-%m-%d")
    db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher.id,
        ClassSession.date < today_date_str,
        ClassSession.status == SessionStatus.ACTIVE.value
    ).update({"status": SessionStatus.CLOSED.value})
    db.commit()

    # Check if there is an ongoing ACTIVE session for this teacher today
    active_session = db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher.id,
        ClassSession.date == today_date_str,
        ClassSession.status == SessionStatus.ACTIVE.value
    ).order_by(ClassSession.start_time.desc()).first()

    req_base_url = get_request_base_url(request, base_url)
    active_session_data = None
    if active_session:
        token = active_session.current_qr_token
        if not token:
            token, qr_data_url, expires_at = QRService.generate_session_qr(db, active_session, base_url=req_base_url)
        else:
            qr_data_url = QRService.get_qr_image_data_url(token, base_url=req_base_url)
            expires_at = active_session.qr_expires_at

        total_marked = db.query(AttendanceRecord).filter(
            AttendanceRecord.class_session_id == active_session.id,
            AttendanceRecord.status == AttendanceStatus.PRESENT.value
        ).count()

        active_session_data = {
            "session_id": active_session.id,
            "subject_id": active_session.subject_id,
            "subject_name": active_session.subject.name if active_session.subject else "",
            "subject_code": active_session.subject.code if active_session.subject else "",
            "section_name": active_session.section.name if active_session.section else "",
            "semester_number": active_session.semester.semester_number if active_session.semester else 1,
            "room_number": active_session.classroom.room_number if active_session.classroom else "",
            "date": active_session.date,
            "start_time": active_session.start_time.strftime("%H:%M") if active_session.start_time else "",
            "current_qr_token": token,
            "qr_data_url": qr_data_url,
            "qr_expires_at": expires_at.isoformat() if expires_at else None,
            "total_marked": total_marked,
            "status": active_session.status
        }

    today_classes = []
    for slot in slots:
        # Check if an active/closed session exists today
        session = db.query(ClassSession).filter(
            ClassSession.teacher_id == teacher.id,
            ClassSession.subject_id == slot.subject_id,
            ClassSession.section_id == slot.section_id,
            ClassSession.date == today_date_str
        ).order_by(ClassSession.start_time.desc()).first()

        present_count = 0
        current_session_id = None
        session_status = "SCHEDULED"

        if session:
            current_session_id = session.id
            session_status = session.status
            present_count = db.query(AttendanceRecord).filter(
                AttendanceRecord.class_session_id == session.id,
                AttendanceRecord.status == AttendanceStatus.PRESENT.value
            ).count()

        today_classes.append({
            "slot_id": slot.id,
            "session_id": current_session_id,
            "subject_id": slot.subject_id,
            "subject_name": slot.subject.name if slot.subject else "",
            "subject_code": slot.subject.code if slot.subject else "",
            "section_id": slot.section_id,
            "section_name": slot.section.name if slot.section else "",
            "semester_id": slot.semester_id,
            "semester_number": slot.semester.semester_number if slot.semester else 1,
            "classroom_id": slot.classroom_id,
            "room_number": slot.classroom.room_number if slot.classroom else "",
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "status": session_status,
            "present_count": present_count
        })

    return {
        "success": True,
        "data": {
            "teacher": {
                "full_name": user.full_name,
                "employee_id": teacher.employee_id,
                "department": teacher.department.name if teacher.department else "",
                "designation": teacher.designation
            },
            "active_session": active_session_data,
            "assigned_subjects": assigned_subjects,
            "today_classes": today_classes
        }
    }


@router.post("/classes/start", status_code=status.HTTP_201_CREATED)
def start_class_session(
    data: StartSessionRequest,
    request: Request,
    base_url: Optional[str] = Query(None),
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Teacher starts a real live class session.
    Generates a cryptographically signed dynamic QR code.
    Teacher can only start classes for assigned subjects.
    """
    user, teacher = auth_data
    req_base_url = get_request_base_url(request, base_url)

    # Verify assignment
    assignment = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher.id,
        TeacherSubjectAssignment.subject_id == data.subject_id,
        TeacherSubjectAssignment.section_id == data.section_id,
        TeacherSubjectAssignment.semester_id == data.semester_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not assigned to teach this subject and section."
        )

    # Check if there is already an ACTIVE session for this subject, section, and date
    today_date_str = date.today().strftime("%Y-%m-%d")
    existing_active = db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher.id,
        ClassSession.subject_id == data.subject_id,
        ClassSession.section_id == data.section_id,
        ClassSession.date == today_date_str,
        ClassSession.status == SessionStatus.ACTIVE.value
    ).first()

    if existing_active:
        # Return existing active session with refreshed QR
        token, qr_data_url, expires_at = QRService.generate_session_qr(db, existing_active, base_url=req_base_url)
        return {
            "success": True,
            "message": "Resumed existing active class session.",
            "data": {
                "session_id": existing_active.id,
                "subject_name": existing_active.subject.name if existing_active.subject else "",
                "subject_code": existing_active.subject.code if existing_active.subject else "",
                "section_name": existing_active.section.name if existing_active.section else "",
                "room_number": existing_active.classroom.room_number if existing_active.classroom else "",
                "qr_token": token,
                "qr_data_url": qr_data_url,
                "expires_at": expires_at.isoformat(),
                "status": existing_active.status
            }
        }

    # Create new ACTIVE class session
    allowed_radius = getattr(data, "allowed_radius_meters", None) or 50.0
    new_session = ClassSession(
        teacher_id=teacher.id,
        subject_id=data.subject_id,
        section_id=data.section_id,
        semester_id=data.semester_id,
        classroom_id=data.classroom_id,
        date=today_date_str,
        start_time=datetime.utcnow(),
        status=SessionStatus.ACTIVE.value,
        allowed_radius_meters=allowed_radius
    )
    db.add(new_session)
    db.flush()

    token, qr_data_url, expires_at = QRService.generate_session_qr(db, new_session, base_url=req_base_url)

    AuditService.log(
        db=db,
        action="CLASS_STARTED",
        target_type="CLASS_SESSION",
        user=user,
        target_id=new_session.id,
        details={
            "subject_id": data.subject_id,
            "section_id": data.section_id,
            "date": today_date_str,
            "allowed_radius_meters": allowed_radius
        }
    )

    return {
        "success": True,
        "message": "Class session started successfully. Dynamic QR generated.",
        "data": {
            "session_id": new_session.id,
            "subject_name": new_session.subject.name if new_session.subject else "",
            "subject_code": new_session.subject.code if new_session.subject else "",
            "section_name": new_session.section.name if new_session.section else "",
            "room_number": new_session.classroom.room_number if new_session.classroom else "",
            "qr_token": token,
            "qr_data_url": qr_data_url,
            "expires_at": expires_at.isoformat(),
            "status": new_session.status,
            "allowed_radius_meters": allowed_radius
        }
    }



@router.post("/classes/{session_id}/refresh-qr")
def refresh_class_qr(
    session_id: str,
    request: Request,
    base_url: Optional[str] = Query(None),
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Refreshes the dynamic QR code for an active session to prevent screenshot reuse.
    """
    user, teacher = auth_data
    req_base_url = get_request_base_url(request, base_url)
    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.teacher_id == teacher.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active session not found or you do not have permission to manage it."
        )

    if session.status != SessionStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot refresh QR for a class with status '{session.status}'."
        )

    token, qr_data_url, expires_at = QRService.generate_session_qr(db, session, base_url=req_base_url)

    return {
        "success": True,
        "message": "Dynamic QR refreshed.",
        "data": {
            "session_id": session.id,
            "qr_token": token,
            "qr_data_url": qr_data_url,
            "expires_at": expires_at.isoformat()
        }
    }


@router.post("/classes/{session_id}/close")
def close_class_session(
    session_id: str,
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Teacher closes the live class session.
    Sets status to CLOSED and invalidates QR immediately.
    """
    user, teacher = auth_data
    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.teacher_id == teacher.id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    session.status = SessionStatus.CLOSED.value
    session.end_time = datetime.utcnow()
    session.current_qr_token = None  # Immediate invalidation
    db.commit()

    # Total attendees
    count = db.query(AttendanceRecord).filter(
        AttendanceRecord.class_session_id == session.id,
        AttendanceRecord.status == AttendanceStatus.PRESENT.value
    ).count()

    AuditService.log(
        db=db,
        action="CLASS_CLOSED",
        target_type="CLASS_SESSION",
        user=user,
        target_id=session.id,
        details={"present_count": count}
    )

    return {
        "success": True,
        "message": f"Class session closed. Attendance finalized ({count} present).",
        "data": {
            "session_id": session.id,
            "status": session.status,
            "present_count": count
        }
    }


@router.get("/classes/{session_id}/live")
def get_live_class_attendance(
    session_id: str,
    request: Request,
    base_url: Optional[str] = Query(None),
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Live stream of students who marked attendance in this session.
    """
    user, teacher = auth_data
    req_base_url = get_request_base_url(request, base_url)
    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.teacher_id == teacher.id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.class_session_id == session.id
    ).order_by(AttendanceRecord.marked_at.desc()).all()

    attendees = []
    for r in records:
        attendees.append({
            "record_id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.user.full_name if r.student and r.student.user else "Unknown",
            "registration_number": r.student.registration_number if r.student else "",
            "roll_number": r.student.roll_number if r.student else "",
            "marked_at": r.marked_at.strftime("%H:%M:%S"),
            "distance_meters": r.distance_meters,
            "is_geofence_verified": r.is_geofence_verified,
            "is_wifi_verified": r.is_wifi_verified,
            "photo_url": r.photo_path
        })

    # Stable QR token and data URL (do NOT auto-regenerate inside 2.5s polling loop)
    qr_token = session.current_qr_token
    qr_data_url = None
    qr_expires_at = session.qr_expires_at

    if qr_token:
        qr_data_url = QRService.get_qr_image_data_url(qr_token, base_url=req_base_url)
    elif session.status == SessionStatus.ACTIVE.value:
        qr_token, qr_data_url, qr_expires_at = QRService.generate_session_qr(db, session, base_url=req_base_url)

    return {
        "success": True,
        "data": {
            "session_id": session.id,
            "subject_name": session.subject.name if session.subject else "",
            "subject_code": session.subject.code if session.subject else "",
            "section_name": session.section.name if session.section else "",
            "room_number": session.classroom.room_number if session.classroom else "",
            "semester_number": session.semester.semester_number if session.semester else 1,
            "status": session.status,
            "current_qr_token": qr_token,
            "qr_token": qr_token,
            "qr_data_url": qr_data_url,
            "qr_expires_at": qr_expires_at.isoformat() if qr_expires_at else None,
            "allowed_radius_meters": getattr(session, "allowed_radius_meters", 50.0) or 50.0,
            "total_marked": len(attendees),
            "attendees": attendees
        }
    }



@router.get("/correction-requests")
def get_teacher_correction_requests(
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Lists attendance correction requests submitted for this teacher's classes.
    """
    user, teacher = auth_data
    requests = db.query(AttendanceCorrectionRequest).join(ClassSession).filter(
        ClassSession.teacher_id == teacher.id
    ).order_by(AttendanceCorrectionRequest.created_at.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "student_name": r.student.user.full_name if r.student and r.student.user else "",
                "registration_number": r.student.registration_number if r.student else "",
                "roll_number": r.student.roll_number if r.student else "",
                "subject_name": r.subject.name if r.subject else "",
                "subject_code": r.subject.code if r.subject else "",
                "class_date": r.class_session.date if r.class_session else "",
                "reason": r.reason,
                "status": r.status,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
                "reviewer_comments": r.reviewer_comments
            }
            for r in requests
        ]
    }


@router.post("/correction-requests/{request_id}/review")
def review_correction_request(
    request_id: str,
    data: AttendanceCorrectionReview,
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Teacher reviews and approves or rejects a student's correction request.
    If approved, creates an AttendanceRecord for the student.
    """
    user, teacher = auth_data
    req = db.query(AttendanceCorrectionRequest).join(ClassSession).filter(
        AttendanceCorrectionRequest.id == request_id,
        ClassSession.teacher_id == teacher.id
    ).first()

    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Correction request not found or unauthorized."
        )

    if req.status != CorrectionStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This request has already been reviewed ({req.status})."
        )

    req.status = data.status.upper()
    req.reviewer_comments = data.reviewer_comments
    req.reviewed_by = user.id
    req.reviewed_at = datetime.utcnow()

    if req.status == CorrectionStatus.APPROVED.value:
        # Check if record already exists
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.class_session_id == req.class_session_id,
            AttendanceRecord.student_id == req.student_id
        ).first()

        if not existing:
            new_record = AttendanceRecord(
                class_session_id=req.class_session_id,
                student_id=req.student_id,
                subject_id=req.subject_id,
                semester_id=req.class_session.semester_id,
                status=AttendanceStatus.PRESENT.value,
                verification_method="CORRECTION_APPROVED",
                is_geofence_verified=True,
                is_wifi_verified=True,
                marked_at=datetime.utcnow()
            )
            db.add(new_record)

    db.commit()

    AuditService.log(
        db=db,
        action="CORRECTION_REVIEWED",
        target_type="CORRECTION_REQUEST",
        user=user,
        target_id=req.id,
        details={"status": req.status, "comments": data.reviewer_comments}
    )

    return {
        "success": True,
        "message": f"Attendance correction request {req.status.lower()}.",
        "data": {
            "id": req.id,
            "status": req.status
        }
    }


@router.get("/sessions")
def get_teacher_sessions(
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Returns historical and active class sessions taught by this teacher.
    """
    user, teacher = auth_data
    sessions = db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher.id
    ).order_by(ClassSession.date.desc(), ClassSession.start_time.desc()).limit(100).all()

    results = []
    for s in sessions:
        present_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.class_session_id == s.id,
            AttendanceRecord.status == AttendanceStatus.PRESENT.value
        ).count()

        total_enrolled = db.query(Student).filter(
            Student.section_id == s.section_id,
            Student.semester_id == s.semester_id
        ).count()

        results.append({
            "id": s.id,
            "subject_id": s.subject_id,
            "subject_name": s.subject.name if s.subject else "",
            "subject_code": s.subject.code if s.subject else "",
            "section_id": s.section_id,
            "section_name": s.section.name if s.section else "",
            "semester_number": s.semester.semester_number if s.semester else 1,
            "room_number": s.classroom.room_number if s.classroom else "",
            "date": s.date,
            "start_time": s.start_time.strftime("%H:%M") if s.start_time else "",
            "end_time": s.end_time.strftime("%H:%M") if s.end_time else None,
            "status": s.status,
            "present_count": present_count,
            "total_enrolled": total_enrolled,
            "current_qr_token": s.current_qr_token if s.status == SessionStatus.ACTIVE.value else None
        })

    return {
        "success": True,
        "data": results
    }


@router.get("/sessions/{session_id}/report")
def get_session_attendance_report(
    session_id: str,
    auth_data: tuple[User, Teacher] = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Returns full section attendance report for a specific session with anti-proxy details.
    """
    user, teacher = auth_data
    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.teacher_id == teacher.id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # Get all students in the section
    students = db.query(Student).filter(
        Student.section_id == session.section_id,
        Student.semester_id == session.semester_id
    ).all()

    # Get records for this session
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.class_session_id == session.id
    ).all()
    records_by_student = {r.student_id: r for r in records}

    student_reports = []
    for st in students:
        rec = records_by_student.get(st.id)
        student_reports.append({
            "student_id": st.id,
            "student_name": st.user.full_name if st.user else "Student",
            "registration_number": st.registration_number,
            "roll_number": st.roll_number,
            "status": rec.status if rec else "ABSENT",
            "marked_at": rec.marked_at.strftime("%H:%M:%S") if rec else None,
            "verification_method": rec.verification_method if rec else None,
            "distance_meters": rec.distance_meters if rec else None,
            "is_geofence_verified": rec.is_geofence_verified if rec else False,
            "is_wifi_verified": rec.is_wifi_verified if rec else False,
            "photo_url": rec.photo_path if rec else None
        })

    # Sort: PRESENT first, then alphabetical by name
    student_reports.sort(key=lambda x: (x["status"] != "PRESENT", x["student_name"]))

    present_count = sum(1 for s in student_reports if s["status"] == "PRESENT")
    total_count = len(student_reports)
    attendance_pct = round((present_count / total_count * 100), 1) if total_count > 0 else 0.0

    return {
        "success": True,
        "data": {
            "session": {
                "id": session.id,
                "subject_name": session.subject.name if session.subject else "",
                "subject_code": session.subject.code if session.subject else "",
                "section_name": session.section.name if session.section else "",
                "room_number": session.classroom.room_number if session.classroom else "",
                "date": session.date,
                "start_time": session.start_time.strftime("%H:%M") if session.start_time else "",
                "end_time": session.end_time.strftime("%H:%M") if session.end_time else None,
                "status": session.status,
                "present_count": present_count,
                "total_enrolled": total_count,
                "attendance_percentage": attendance_pct
            },
            "students": student_reports
        }
    }
