import json
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, Teacher, Student, Admin, RoleEnum
from app.models.academic import (
    Subject,
    Section,
    Semester,
    Classroom,
    TeacherSubjectAssignment,
)
from app.models.attendance import (
    ClassSession,
    AttendanceRecord,
    AttendanceStatus,
    SessionStatus,
)
from app.models.audit import AuditLog
from app.services.audit_service import AuditService
from app.services.attendance_service import AttendanceService
from app.schemas.attendance import (
    SubmitRegisterRequest,
    UpdateStudentAttendanceRequest,
)

router = APIRouter()


def require_staff_or_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Ensures user is either an active TEACHER or an HOD_ADMIN.
    """
    if current_user.role not in [RoleEnum.TEACHER.value, RoleEnum.HOD_ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Teacher or HOD Admin privileges required."
        )
    return current_user


@router.get("/options")
def get_attendance_management_options(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """
    Returns available subjects, sections, and faculty.
    - Teachers only receive classes/subjects assigned to them.
    - HODs receive all department classes, subjects, and teachers.
    """
    is_hod = current_user.role == RoleEnum.HOD_ADMIN.value

    if is_hod:
        admin = db.query(Admin).filter(Admin.user_id == current_user.id).first()
        dept_id = admin.department_id if admin else None

        # Department subjects
        subj_query = db.query(Subject)
        if dept_id:
            subj_query = subj_query.filter(Subject.department_id == dept_id)
        subjects = subj_query.order_by(Subject.name).all()

        # Department sections
        sections = db.query(Section).order_by(Section.name).all()

        # Department teachers
        teacher_query = db.query(Teacher)
        if dept_id:
            teacher_query = teacher_query.filter(Teacher.department_id == dept_id)
        teachers = teacher_query.all()

        teacher_list = [
            {
                "id": t.id,
                "name": t.user.full_name if t.user else "Faculty",
                "email": t.user.email if t.user else "",
                "employee_id": t.employee_id
            }
            for t in teachers
        ]

        classes_list = []
        for s in subjects:
            for sec in sections:
                # Find assigned teacher if any
                ass = db.query(TeacherSubjectAssignment).filter(
                    TeacherSubjectAssignment.subject_id == s.id,
                    TeacherSubjectAssignment.section_id == sec.id
                ).first()
                classes_list.append({
                    "subject_id": s.id,
                    "subject_name": s.name,
                    "subject_code": s.code,
                    "section_id": sec.id,
                    "section_name": sec.name,
                    "semester_id": s.semester_id if hasattr(s, 'semester_id') and s.semester_id else None,
                    "semester_number": s.semester_number,
                    "assigned_teacher_id": ass.teacher_id if ass else (teachers[0].id if teachers else None),
                    "assigned_teacher_name": ass.teacher.user.full_name if ass and ass.teacher and ass.teacher.user else ""
                })

        return {
            "success": True,
            "data": {
                "is_hod": True,
                "teachers": teacher_list,
                "classes": classes_list
            }
        }

    else:
        # Teacher: only assigned subjects and sections
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found.")

        assignments = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id
        ).all()

        classes_list = [
            {
                "assignment_id": a.id,
                "subject_id": a.subject_id,
                "subject_name": a.subject.name if a.subject else "",
                "subject_code": a.subject.code if a.subject else "",
                "section_id": a.section_id,
                "section_name": a.section.name if a.section else "",
                "semester_id": a.semester_id,
                "semester_number": a.semester.semester_number if a.semester else 1,
                "assigned_teacher_id": teacher.id,
                "assigned_teacher_name": current_user.full_name
            }
            for a in assignments
        ]

        return {
            "success": True,
            "data": {
                "is_hod": False,
                "teachers": [
                    {
                        "id": teacher.id,
                        "name": current_user.full_name,
                        "email": current_user.email,
                        "employee_id": teacher.employee_id
                    }
                ],
                "classes": classes_list
            }
        }


@router.get("/roster")
def get_attendance_roster(
    subject_id: str = Query(...),
    section_id: str = Query(...),
    date_str: str = Query(..., alias="date"),
    teacher_id: Optional[str] = Query(None),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """
    Returns the enrolled students for the given subject, section, and date,
    along with their current attendance status (PRESENT, ABSENT, or UNMARKED).
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    section = db.query(Section).filter(Section.id == section_id).first()

    if not subject or not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject or Section not found.")

    # Permissions check
    if current_user.role == RoleEnum.TEACHER.value:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        effective_teacher_id = teacher.id
    else:
        effective_teacher_id = teacher_id

    # Find existing class session for this date & class
    session_query = db.query(ClassSession).filter(
        ClassSession.subject_id == subject_id,
        ClassSession.section_id == section_id,
        ClassSession.date == date_str
    )
    if effective_teacher_id:
        # First check matching teacher
        session = session_query.filter(ClassSession.teacher_id == effective_teacher_id).order_by(ClassSession.created_at.desc()).first()
    else:
        session = None

    if not session:
        # Fallback: check any session for that subject/section/date
        session = session_query.order_by(ClassSession.created_at.desc()).first()

    # Find all students enrolled in this section
    student_query = db.query(Student).filter(Student.section_id == section_id)
    # If semester is specified on subject, filter matching semester if student semester is set
    if subject.semester_number:
        sem = db.query(Semester).filter(Semester.semester_number == subject.semester_number).first()
        if sem:
            student_query = student_query.filter(Student.semester_id == sem.id)
    students = student_query.join(User).order_by(Student.roll_number, User.full_name).all()

    # If no students match semester filter, get all students in that section
    if not students:
        students = db.query(Student).filter(Student.section_id == section_id).join(User).order_by(Student.roll_number, User.full_name).all()

    # Map attendance records if session exists
    records_by_student = {}
    if session:
        records = db.query(AttendanceRecord).filter(AttendanceRecord.class_session_id == session.id).all()
        for r in records:
            records_by_student[r.student_id] = r

    roster = []
    present_count = 0
    absent_count = 0
    unmarked_count = 0

    for s in students:
        rec = records_by_student.get(s.id)
        if rec:
            st = rec.status
            if st == AttendanceStatus.PRESENT.value:
                present_count += 1
            else:
                absent_count += 1
            rec_id = rec.id
            method = rec.verification_method
            marked_time = rec.marked_at.strftime("%H:%M:%S") if rec.marked_at else None
        else:
            st = "UNMARKED"
            unmarked_count += 1
            rec_id = None
            method = None
            marked_time = None

        roster.append({
            "student_id": s.id,
            "full_name": s.user.full_name if s.user else "Student",
            "registration_number": s.registration_number,
            "roll_number": s.roll_number or "-",
            "status": st,
            "record_id": rec_id,
            "verification_method": method,
            "marked_at": marked_time,
            "photo_url": s.photo_url
        })

    session_teacher_name = session.teacher.user.full_name if session and session.teacher and session.teacher.user else ""

    return {
        "success": True,
        "data": {
            "session_id": session.id if session else None,
            "session_status": session.status if session else None,
            "date": date_str,
            "subject": {
                "id": subject.id,
                "name": subject.name,
                "code": subject.code
            },
            "section": {
                "id": section.id,
                "name": section.name
            },
            "teacher_name": session_teacher_name,
            "summary": {
                "total_students": len(students),
                "present_count": present_count,
                "absent_count": absent_count,
                "unmarked_count": unmarked_count
            },
            "students": roster
        }
    }


@router.post("/submit-register")
def submit_digital_attendance_register(
    data: SubmitRegisterRequest,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """
    Submits a full digital roll-call attendance register for a specific date.
    Creates or updates the ClassSession and records attendance for all students.
    """
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    section = db.query(Section).filter(Section.id == data.section_id).first()

    if not subject or not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject or Section not found.")

    # Determine teacher ID
    if current_user.role == RoleEnum.TEACHER.value:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        effective_teacher_id = teacher.id
    else:
        # HOD can specify teacher or default to assigned teacher
        if data.teacher_id:
            effective_teacher_id = data.teacher_id
        else:
            ass = db.query(TeacherSubjectAssignment).filter(
                TeacherSubjectAssignment.subject_id == data.subject_id,
                TeacherSubjectAssignment.section_id == data.section_id
            ).first()
            if ass:
                effective_teacher_id = ass.teacher_id
            else:
                first_t = db.query(Teacher).first()
                effective_teacher_id = first_t.id if first_t else None

    if not effective_teacher_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No faculty assigned for this subject and section.")

    # Semester ID resolution
    semester_id = data.semester_id
    if not semester_id:
        sem = db.query(Semester).filter(Semester.semester_number == subject.semester_number).first()
        semester_id = sem.id if sem else db.query(Semester).first().id

    # Classroom ID fallback
    classroom_id = data.classroom_id
    if not classroom_id:
        cr = db.query(Classroom).first()
        classroom_id = cr.id if cr else "cr-001"

    # Find or create ClassSession for this date
    session = db.query(ClassSession).filter(
        ClassSession.teacher_id == effective_teacher_id,
        ClassSession.subject_id == data.subject_id,
        ClassSession.section_id == data.section_id,
        ClassSession.date == data.date
    ).order_by(ClassSession.created_at.desc()).first()

    if not session:
        session = ClassSession(
            teacher_id=effective_teacher_id,
            subject_id=data.subject_id,
            section_id=data.section_id,
            semester_id=semester_id,
            classroom_id=classroom_id,
            date=data.date,
            start_time=datetime.utcnow(),
            status=SessionStatus.CLOSED.value  # Manual registers are saved and closed
        )
        db.add(session)
        db.flush()

    present_count = 0
    absent_count = 0

    for item in data.records:
        rec = db.query(AttendanceRecord).filter(
            AttendanceRecord.class_session_id == session.id,
            AttendanceRecord.student_id == item.student_id
        ).first()

        status_val = AttendanceStatus.PRESENT.value if item.status.upper() == "PRESENT" else AttendanceStatus.ABSENT.value

        if status_val == AttendanceStatus.PRESENT.value:
            present_count += 1
        else:
            absent_count += 1

        if rec:
            rec.status = status_val
            rec.verification_method = "DIGITAL_REGISTER"
            rec.marked_at = datetime.utcnow()
        else:
            new_rec = AttendanceRecord(
                class_session_id=session.id,
                student_id=item.student_id,
                subject_id=data.subject_id,
                semester_id=semester_id,
                status=status_val,
                verification_method="DIGITAL_REGISTER",
                marked_at=datetime.utcnow()
            )
            db.add(new_rec)

    db.commit()

    # Record Audit Log
    AuditService.log(
        db=db,
        action="DIGITAL_REGISTER_SUBMITTED",
        target_type="CLASS_SESSION",
        user=current_user,
        target_id=session.id,
        details={
            "date": data.date,
            "subject_name": subject.name,
            "subject_code": subject.code,
            "section_name": section.name,
            "present_count": present_count,
            "absent_count": absent_count,
            "total_marked": len(data.records),
            "remarks": data.remarks or "Digital roll call register",
            "submitted_by": current_user.full_name,
            "role": current_user.role
        }
    )

    return {
        "success": True,
        "message": f"Attendance register successfully saved ({present_count} Present, {absent_count} Absent).",
        "data": {
            "session_id": session.id,
            "date": data.date,
            "present_count": present_count,
            "absent_count": absent_count,
            "total_marked": len(data.records)
        }
    }


@router.post("/update-student-status")
def update_student_attendance_status(
    data: UpdateStudentAttendanceRequest,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """
    Modifies an individual student's attendance record for a specific date (Present <-> Absent).
    Immediately updates the student's attendance and logs an immutable audit event.
    """
    student = db.query(Student).filter(
        (Student.id == data.student_id) | (Student.user_id == data.student_id)
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    target_status = AttendanceStatus.PRESENT.value if data.status.upper() == "PRESENT" else AttendanceStatus.ABSENT.value

    # If session_id is provided directly
    session = None
    if data.session_id:
        session = db.query(ClassSession).filter(ClassSession.id == data.session_id).first()

    # Otherwise look up session by subject, section, and date
    if not session and data.subject_id and data.section_id and data.date:
        session = db.query(ClassSession).filter(
            ClassSession.subject_id == data.subject_id,
            ClassSession.section_id == data.section_id,
            ClassSession.date == data.date
        ).order_by(ClassSession.created_at.desc()).first()

        if not session:
            # Create session on the fly for this manual correction
            ass = db.query(TeacherSubjectAssignment).filter(
                TeacherSubjectAssignment.subject_id == data.subject_id,
                TeacherSubjectAssignment.section_id == data.section_id
            ).first()
            teacher_id = ass.teacher_id if ass else db.query(Teacher).first().id
            classroom = db.query(Classroom).first()

            subj = db.query(Subject).filter(Subject.id == data.subject_id).first()
            sem = db.query(Semester).filter(Semester.semester_number == subj.semester_number).first() if subj else None

            session = ClassSession(
                teacher_id=teacher_id,
                subject_id=data.subject_id,
                section_id=data.section_id,
                semester_id=sem.id if sem else student.semester_id,
                classroom_id=classroom.id if classroom else "cr-001",
                date=data.date,
                start_time=datetime.utcnow(),
                status=SessionStatus.CLOSED.value
            )
            db.add(session)
            db.flush()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not locate or initialize a class session for this record."
        )

    # Permission check for teachers
    if current_user.role == RoleEnum.TEACHER.value:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if session.teacher_id != teacher.id:
            # Check if teacher is assigned to this subject
            is_assigned = db.query(TeacherSubjectAssignment).filter(
                TeacherSubjectAssignment.teacher_id == teacher.id,
                TeacherSubjectAssignment.subject_id == session.subject_id,
                TeacherSubjectAssignment.section_id == session.section_id
            ).first()
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to modify attendance for this class."
                )

    # Find or create record
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.class_session_id == session.id,
        AttendanceRecord.student_id == student.id
    ).first()

    old_status = record.status if record else "UNMARKED"
    method = f"MANUAL_{current_user.role}"

    if record:
        record.status = target_status
        record.verification_method = method
        record.marked_at = datetime.utcnow()
    else:
        record = AttendanceRecord(
            class_session_id=session.id,
            student_id=student.id,
            subject_id=session.subject_id,
            semester_id=session.semester_id,
            status=target_status,
            verification_method=method,
            marked_at=datetime.utcnow()
        )
        db.add(record)

    db.commit()

    # Log immutable audit entry
    AuditService.log(
        db=db,
        action="ATTENDANCE_OVERRIDE",
        target_type="ATTENDANCE_RECORD",
        user=current_user,
        target_id=record.id,
        details={
            "student_id": student.id,
            "student_name": student.user.full_name if student.user else "Student",
            "registration_number": student.registration_number,
            "subject_name": session.subject.name if session.subject else "",
            "subject_code": session.subject.code if session.subject else "",
            "section_name": session.section.name if session.section else "",
            "date": session.date,
            "old_status": old_status,
            "new_status": target_status,
            "reason": data.reason or "Manual attendance adjustment",
            "changed_by": current_user.full_name,
            "changed_by_role": current_user.role
        }
    )

    # Calculate updated overall student percentage
    student_stats = AttendanceService.calculate_student_stats(db, student.id)

    return {
        "success": True,
        "message": f"Updated attendance for {student.user.full_name if student.user else 'student'} from {old_status} to {target_status}.",
        "data": {
            "record_id": record.id,
            "student_id": student.id,
            "student_name": student.user.full_name if student.user else "Student",
            "status": target_status,
            "old_status": old_status,
            "updated_overall_percentage": student_stats.percentage,
            "updated_attendance_percentage": student_stats.percentage,
            "date": session.date
        }
    }


@router.get("/audit-history")
def get_attendance_audit_history(
    subject_id: Optional[str] = Query(None),
    date_str: Optional[str] = Query(None, alias="date"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """
    Returns audit trail of manual attendance edits and digital register submissions.
    """
    actions = ["ATTENDANCE_OVERRIDE", "DIGITAL_REGISTER_SUBMITTED"]

    query = db.query(AuditLog).filter(AuditLog.action.in_(actions))

    # If teacher, show their edits or their assigned classes
    if current_user.role == RoleEnum.TEACHER.value:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        query = query.filter(AuditLog.user_id == current_user.id)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()

    formatted_logs = []
    for l in logs:
        details_obj = {}
        if l.details:
            try:
                details_obj = json.loads(l.details)
            except Exception:
                details_obj = {"raw": l.details}

        # Date filtering if requested
        if date_str and details_obj.get("date") != date_str:
            continue

        formatted_logs.append({
            "id": l.id,
            "action": l.action,
            "changed_by": details_obj.get("changed_by") or l.user_email or "Faculty",
            "role": details_obj.get("changed_by_role") or l.user_role or "TEACHER",
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "student_name": details_obj.get("student_name") or "-",
            "registration_number": details_obj.get("registration_number") or "-",
            "subject_name": details_obj.get("subject_name") or "-",
            "date": details_obj.get("date") or "-",
            "old_status": details_obj.get("old_status") or "-",
            "new_status": details_obj.get("new_status") or details_obj.get("status") or "-",
            "reason": details_obj.get("reason") or details_obj.get("remarks") or "Direct attendance modification"
        })

    return {
        "success": True,
        "data": {
            "total": len(formatted_logs),
            "history": formatted_logs
        }
    }
