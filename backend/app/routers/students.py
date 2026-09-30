from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional, List

from app.database import get_db
from app.models.user import Student, User
from app.models.academic import Subject, Semester, Section, Classroom, TimetableSlot
from app.models.attendance import (
    ClassSession,
    AttendanceRecord,
    AttendanceCorrectionRequest,
    SemesterPromotion,
    SessionStatus,
    AttendanceStatus,
)
from app.schemas.attendance import (
    OverallAttendanceStats,
    AttendanceCorrectionCreate,
    AttendanceCorrectionResponse,
)
from app.dependencies import require_student
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/api/v1/students", tags=["Student Features"])


@router.get("/dashboard")
def get_student_dashboard(
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Returns student dashboard data:
    Department, Section, Current Semester, Overall Attendance Stats, Today's Classes, Next Class.
    """
    user, student = auth_data
    stats = AttendanceService.calculate_student_stats(db, student.id)

    # Fetch today's day of week (e.g., "Monday")
    today_date_str = date.today().strftime("%Y-%m-%d")
    today_day_name = date.today().strftime("%A")

    # Fetch today's scheduled timetable slots for student's section and semester
    slots = db.query(TimetableSlot).filter(
        TimetableSlot.semester_id == student.semester_id,
        TimetableSlot.section_id == student.section_id,
        TimetableSlot.day_of_week == today_day_name
    ).order_by(TimetableSlot.start_time).all()

    today_classes = []
    next_class = None
    current_time_str = datetime.now().strftime("%H:%M")

    for slot in slots:
        # Check if an active or closed session exists for today
        session = db.query(ClassSession).filter(
            ClassSession.subject_id == slot.subject_id,
            ClassSession.section_id == slot.section_id,
            ClassSession.date == today_date_str
        ).first()

        # Check if student marked attendance
        has_marked = False
        class_status = "Upcoming"
        session_id = None
        current_qr_token = None

        if session:
            session_id = session.id
            current_qr_token = session.current_qr_token
            att = db.query(AttendanceRecord).filter(
                AttendanceRecord.class_session_id == session.id,
                AttendanceRecord.student_id == student.id
            ).first()
            if att:
                has_marked = True
                class_status = "Attendance Marked"
            elif session.status == SessionStatus.ACTIVE.value:
                class_status = "Live"
            elif session.status == SessionStatus.CLOSED.value:
                class_status = "Completed"
        else:
            if slot.start_time <= current_time_str <= slot.end_time:
                class_status = "Upcoming"
            elif current_time_str > slot.end_time:
                class_status = "Completed"
            else:
                class_status = "Upcoming"

        class_item = {
            "slot_id": slot.id,
            "session_id": session_id,
            "subject_id": slot.subject_id,
            "subject_name": slot.subject.name if slot.subject else "",
            "subject_code": slot.subject.code if slot.subject else "",
            "teacher_name": slot.teacher.user.full_name if slot.teacher and slot.teacher.user else "Instructor",
            "room_number": slot.classroom.room_number if slot.classroom else "TBA",
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "status": class_status,
            "has_marked": has_marked,
            "current_qr_token": current_qr_token if class_status == "Live" else None
        }
        today_classes.append(class_item)

        if not next_class and slot.start_time >= current_time_str:
            next_class = class_item

    # If no future class today, pick first upcoming or none
    if not next_class and today_classes:
        for c in today_classes:
            if c["status"] in ("Upcoming", "Live"):
                next_class = c
                break

    return {
        "success": True,
        "data": {
            "student": {
                "full_name": user.full_name,
                "registration_number": student.registration_number,
                "roll_number": student.roll_number,
                "department": student.department.name if student.department else "",
                "department_code": student.department.code if student.department else "",
                "section": student.section.name if student.section else "",
                "semester": student.semester.semester_number if student.semester else 1
            },
            "overall_attendance": {
                "percentage": stats.percentage,
                "present": stats.present,
                "total": stats.total,
                "required_percentage": stats.required_percentage,
                "status": stats.status,
                "shortage_classes": stats.shortage_classes
            },
            "today_classes": today_classes,
            "next_class": next_class
        }
    }


@router.get("/attendance-stats")
def get_student_attendance_stats(
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Returns complete overall and subject-wise attendance breakdown with threshold metrics.
    """
    user, student = auth_data
    stats = AttendanceService.calculate_student_stats(db, student.id)
    return {
        "success": True,
        "data": stats
    }


@router.get("/timetable")
def get_student_timetable(
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Returns weekly timetable for the student's department, semester, and section.
    """
    user, student = auth_data
    slots = db.query(TimetableSlot).filter(
        TimetableSlot.semester_id == student.semester_id,
        TimetableSlot.section_id == student.section_id
    ).order_by(TimetableSlot.start_time).all()

    # Group by day
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    grouped = {day: [] for day in days}

    for slot in slots:
        if slot.day_of_week in grouped:
            grouped[slot.day_of_week].append({
                "id": slot.id,
                "subject_name": slot.subject.name if slot.subject else "",
                "subject_code": slot.subject.code if slot.subject else "",
                "teacher_name": slot.teacher.user.full_name if slot.teacher and slot.teacher.user else "",
                "room_number": slot.classroom.room_number if slot.classroom else "",
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "slot_period": slot.slot_period
            })

    return {
        "success": True,
        "data": grouped
    }


@router.get("/attendance-history")
def get_student_attendance_history(
    subject_id: Optional[str] = Query(None),
    date_filter: Optional[str] = Query(None),
    semester_id: Optional[str] = Query(None),
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Returns detailed attendance logs with optional subject, date, and semester filters.
    """
    user, student = auth_data
    query = db.query(AttendanceRecord).join(ClassSession).filter(
        AttendanceRecord.student_id == student.id
    )

    if subject_id:
        query = query.filter(AttendanceRecord.subject_id == subject_id)
    if date_filter:
        query = query.filter(ClassSession.date == date_filter)
    if semester_id:
        query = query.filter(AttendanceRecord.semester_id == semester_id)

    records = query.order_by(AttendanceRecord.marked_at.desc()).limit(100).all()

    results = []
    for r in records:
        results.append({
            "id": r.id,
            "subject_name": r.subject.name if r.subject else "",
            "subject_code": r.subject.code if r.subject else "",
            "teacher_name": r.class_session.teacher.user.full_name if r.class_session and r.class_session.teacher and r.class_session.teacher.user else "",
            "room_number": r.class_session.classroom.room_number if r.class_session and r.class_session.classroom else "",
            "date": r.class_session.date if r.class_session else "",
            "marked_at": r.marked_at.strftime("%Y-%m-%d %H:%M:%S"),
            "status": r.status,
            "verification_method": r.verification_method,
            "distance_meters": r.distance_meters,
            "is_geofence_verified": r.is_geofence_verified,
            "is_wifi_verified": r.is_wifi_verified,
            "photo_url": r.photo_path
        })

    return {
        "success": True,
        "data": results
    }


@router.get("/academic-history")
def get_student_academic_history(
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Returns historical semester attendance records and current semester status.
    Previous semester attendance is fully preserved.
    """
    user, student = auth_data
    promotions = db.query(SemesterPromotion).filter(
        SemesterPromotion.student_id == student.id
    ).order_by(SemesterPromotion.promotion_date.asc()).all()

    current_semester = db.query(Semester).filter(Semester.id == student.semester_id).first()
    current_stats = AttendanceService.calculate_student_stats(db, student.id)

    history = []
    for p in promotions:
        from_sem = p.from_semester
        history.append({
            "semester_number": from_sem.semester_number if from_sem else 1,
            "percentage": p.final_attendance_percentage,
            "promotion_date": p.promotion_date.strftime("%Y-%m-%d"),
            "status": "Completed",
            "notes": p.notes
        })

    # Current semester
    history.append({
        "semester_number": current_semester.semester_number if current_semester else 1,
        "percentage": current_stats.percentage,
        "promotion_date": None,
        "status": "Current",
        "notes": "In Progress"
    })

    return {
        "success": True,
        "data": history
    }


@router.post("/correction-requests", status_code=status.HTTP_201_CREATED)
def submit_attendance_correction(
    data: AttendanceCorrectionCreate,
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Student submits an attendance correction request for a specific class session.
    """
    user, student = auth_data
    session = db.query(ClassSession).filter(ClassSession.id == data.class_session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class session not found.")

    # Check for existing pending request
    existing = db.query(AttendanceCorrectionRequest).filter(
        AttendanceCorrectionRequest.student_id == student.id,
        AttendanceCorrectionRequest.class_session_id == data.class_session_id,
        AttendanceCorrectionRequest.status == "PENDING"
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending correction request already exists for this class session."
        )

    req = AttendanceCorrectionRequest(
        student_id=student.id,
        class_session_id=data.class_session_id,
        subject_id=data.subject_id,
        requested_status="PRESENT",
        reason=data.reason,
        status="PENDING"
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return {
        "success": True,
        "message": "Attendance correction request submitted for instructor review.",
        "data": {
            "id": req.id,
            "status": req.status
        }
    }


@router.get("/correction-requests")
def get_student_correction_requests(
    auth_data: tuple[User, Student] = Depends(require_student),
    db: Session = Depends(get_db)
):
    user, student = auth_data
    requests = db.query(AttendanceCorrectionRequest).filter(
        AttendanceCorrectionRequest.student_id == student.id
    ).order_by(AttendanceCorrectionRequest.created_at.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "subject_name": r.subject.name if r.subject else "",
                "subject_code": r.subject.code if r.subject else "",
                "date": r.class_session.date if r.class_session else "",
                "reason": r.reason,
                "status": r.status,
                "reviewer_comments": r.reviewer_comments,
                "reviewed_at": r.reviewed_at.strftime("%Y-%m-%d %H:%M") if r.reviewed_at else None,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M")
            }
            for r in requests
        ]
    }
