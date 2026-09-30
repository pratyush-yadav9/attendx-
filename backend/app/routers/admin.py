from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional

from app.database import get_db
from app.models.user import User, Admin, Student, Teacher, RoleEnum
from app.models.academic import (
    Department,
    Semester,
    Section,
    Classroom,
    Subject,
    TeacherSubjectAssignment,
    TimetableSlot,
    AcademicYear,
)
from app.models.attendance import (
    ClassSession,
    AttendanceRecord,
    AttendanceCorrectionRequest,
    SemesterPromotion,
    SessionStatus,
    AttendanceStatus,
)
from app.models.config_models import CollegeLocation, CollegeWifiNetwork, SystemConfig
from app.models.audit import AuditLog
from app.models.notifications import Notification
from app.schemas.user import (
    StudentCreate,
    StudentUpdate,
    TeacherCreate,
    TeacherUpdate,
)
from app.schemas.academic import (
    DepartmentCreate,
    SemesterCreate,
    SectionCreate,
    ClassroomCreate,
    SubjectCreate,
    TeacherAssignmentCreate,
    TimetableSlotCreate,
)
from app.schemas.config import LocationConfigCreate, WifiConfigCreate
from app.schemas.attendance import SemesterPromotionRequest
from app.dependencies import require_hod_admin, hash_password
from app.services.attendance_service import AttendanceService
from app.services.academic_service import AcademicService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/v1/admin", tags=["HOD / Admin Operations"])


@router.get("/dashboard-stats")
def get_admin_dashboard_stats(
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    """
    Live dashboard analytics computed directly from the database:
    - Total students
    - Total teachers
    - Today's classes
    - Average college attendance percentage
    - Students below configured threshold
    """
    user, admin = auth_data
    today_date_str = date.today().strftime("%Y-%m-%d")

    total_students = db.query(Student).count()
    total_teachers = db.query(Teacher).count()
    today_classes = db.query(ClassSession).filter(ClassSession.date == today_date_str).count()
    if today_classes == 0:
        today_classes = db.query(TimetableSlot).filter(
            TimetableSlot.day_of_week == date.today().strftime("%A")
        ).count()

    threshold = AttendanceService.get_configured_threshold(db)

    # Compute students below threshold and average attendance
    students = db.query(Student).all()
    below_threshold_count = 0
    total_percent_sum = 0.0

    for s in students:
        stats = AttendanceService.calculate_student_stats(db, s.id)
        total_percent_sum += stats.percentage
        if stats.percentage < threshold:
            below_threshold_count += 1

    avg_attendance = round(total_percent_sum / len(students), 1) if students else 0.0

    return {
        "success": True,
        "data": {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "today_classes": today_classes,
            "average_attendance": avg_attendance,
            "students_below_threshold": below_threshold_count,
            "configured_threshold": threshold
        }
    }


# --- Students Management ---
@router.get("/students")
def list_students(
    department_id: Optional[str] = Query(None),
    semester_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if department_id:
        query = query.filter(Student.department_id == department_id)
    if semester_id:
        query = query.filter(Student.semester_id == semester_id)
    if section_id:
        query = query.filter(Student.section_id == section_id)

    students = query.all()
    results = []
    for s in students:
        stats = AttendanceService.calculate_student_stats(db, s.id)
        results.append({
            "id": s.id,
            "user_id": s.user_id,
            "email": s.user.email if s.user else "",
            "full_name": s.user.full_name if s.user else "",
            "registration_number": s.registration_number,
            "roll_number": s.roll_number,
            "department_id": s.department_id,
            "department_name": s.department.name if s.department else "",
            "semester_id": s.semester_id,
            "semester_number": s.semester.semester_number if s.semester else 1,
            "section_id": s.section_id,
            "section_name": s.section.name if s.section else "",
            "photo_url": s.photo_url,
            "attendance_percentage": stats.percentage,
            "attendance_status": stats.status,
            "is_active": s.user.is_active if s.user else True
        })

    return {"success": True, "data": results}


@router.post("/students", status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data

    # Check email duplicate
    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    # Check registration number duplicate
    if db.query(Student).filter(Student.registration_number == data.registration_number.strip().upper()).first():
        raise HTTPException(status_code=400, detail="Student with this registration number already exists.")

    new_user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=RoleEnum.STUDENT.value,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    db.flush()

    student = Student(
        user_id=new_user.id,
        registration_number=data.registration_number.strip().upper(),
        roll_number=data.roll_number,
        department_id=data.department_id,
        semester_id=data.semester_id,
        section_id=data.section_id,
        academic_year_id=data.academic_year_id
    )
    db.add(student)
    db.flush()

    # Biometric Reference Photo Registration (used for Face Verification in Attendance)
    if data.photo_base64:
        try:
            from app.services.face_recognition_service import FaceRecognitionService
            photo_url = FaceRecognitionService.register_student_photo(
                db=db,
                student=student,
                photo_base64=data.photo_base64
            )
            student.photo_url = photo_url
        except Exception as e:
            print(f"[Admin] Warning: Failed to register initial face photo: {e}")

    db.commit()

    AuditService.log(
        db=db,
        action="STUDENT_CREATED",
        target_type="STUDENT",
        user=user,
        target_id=student.id,
        details={
            "registration_number": student.registration_number,
            "email": new_user.email,
            "has_face_photo": bool(student.photo_url)
        }
    )

    return {
        "success": True, 
        "message": "Student registered successfully.", 
        "data": {
            "id": student.id,
            "registration_number": student.registration_number,
            "photo_url": student.photo_url
        }
    }


@router.get("/students/{student_id}")
def get_student_details(
    student_id: str,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    stats = AttendanceService.calculate_student_stats(db, student.id)
    return {
        "success": True,
        "data": {
            "id": student.id,
            "user_id": student.user_id,
            "email": student.user.email if student.user else "",
            "full_name": student.user.full_name if student.user else "",
            "registration_number": student.registration_number,
            "roll_number": student.roll_number,
            "department_id": student.department_id,
            "department_name": student.department.name if student.department else "",
            "semester_id": student.semester_id,
            "semester_number": student.semester.semester_number if student.semester else 1,
            "section_id": student.section_id,
            "section_name": student.section.name if student.section else "",
            "academic_year_id": student.academic_year_id,
            "photo_url": student.photo_url,
            "attendance_percentage": stats.percentage,
            "attendance_status": stats.status,
            "is_active": student.user.is_active if student.user else True
        }
    }


@router.put("/students/{student_id}")
def update_student_profile(
    student_id: str,
    data: StudentUpdate,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Update User account fields
    if data.email and student.user:
        existing_email = db.query(User).filter(
            User.email == data.email.lower(),
            User.id != student.user_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Another account with this email already exists.")
        student.user.email = data.email.lower()

    if data.full_name and student.user:
        student.user.full_name = data.full_name.strip()

    if data.is_active is not None and student.user:
        student.user.is_active = data.is_active

    # Update Student Profile fields
    if data.registration_number and data.registration_number.strip().upper() != student.registration_number:
        clean_reg = data.registration_number.strip().upper()
        existing_reg = db.query(Student).filter(
            Student.registration_number == clean_reg,
            Student.id != student.id
        ).first()
        if existing_reg:
            raise HTTPException(status_code=400, detail="Another student with this registration number already exists.")
        student.registration_number = clean_reg

    if data.roll_number is not None:
        student.roll_number = data.roll_number.strip()
    if data.department_id:
        student.department_id = data.department_id
    if data.semester_id:
        student.semester_id = data.semester_id
    if data.section_id:
        student.section_id = data.section_id

    # Biometric Reference Photo Update for Face Verification
    if data.photo_base64:
        from app.services.face_recognition_service import FaceRecognitionService
        photo_url = FaceRecognitionService.register_student_photo(
            db=db,
            student=student,
            photo_base64=data.photo_base64
        )
        student.photo_url = photo_url

    db.commit()

    AuditService.log(
        db=db,
        action="STUDENT_UPDATED",
        target_type="STUDENT",
        user=user,
        target_id=student.id,
        details={
            "registration_number": student.registration_number,
            "has_photo_updated": bool(data.photo_base64)
        }
    )

    stats = AttendanceService.calculate_student_stats(db, student.id)
    return {
        "success": True,
        "message": f"Student profile for {student.user.full_name} updated successfully.",
        "data": {
            "id": student.id,
            "user_id": student.user_id,
            "email": student.user.email if student.user else "",
            "full_name": student.user.full_name if student.user else "",
            "registration_number": student.registration_number,
            "roll_number": student.roll_number,
            "department_id": student.department_id,
            "department_name": student.department.name if student.department else "",
            "semester_id": student.semester_id,
            "semester_number": student.semester.semester_number if student.semester else 1,
            "section_id": student.section_id,
            "section_name": student.section.name if student.section else "",
            "photo_url": student.photo_url,
            "attendance_percentage": stats.percentage,
            "attendance_status": stats.status,
            "is_active": student.user.is_active if student.user else True
        }
    }



# --- Teachers Management ---
@router.get("/teachers")
def list_teachers(
    department_id: Optional[str] = Query(None),
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Teacher)
    if department_id:
        query = query.filter(Teacher.department_id == department_id)
    teachers = query.all()

    results = []
    for t in teachers:
        results.append({
            "id": t.id,
            "user_id": t.user_id,
            "email": t.user.email if t.user else "",
            "full_name": t.user.full_name if t.user else "",
            "employee_id": t.employee_id,
            "department_id": t.department_id,
            "department_name": t.department.name if t.department else "",
            "designation": t.designation,
            "phone": t.phone,
            "is_active": t.user.is_active if t.user else True
        })
    return {"success": True, "data": results}


@router.post("/teachers", status_code=status.HTTP_201_CREATED)
def create_teacher(
    data: TeacherCreate,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data

    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    if db.query(Teacher).filter(Teacher.employee_id == data.employee_id).first():
        raise HTTPException(status_code=400, detail="Teacher with this employee ID already exists.")

    new_user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=RoleEnum.TEACHER.value,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    db.flush()

    teacher = Teacher(
        user_id=new_user.id,
        employee_id=data.employee_id,
        department_id=data.department_id,
        designation=data.designation,
        phone=data.phone
    )
    db.add(teacher)
    db.commit()

    AuditService.log(
        db=db,
        action="TEACHER_CREATED",
        target_type="TEACHER",
        user=user,
        target_id=teacher.id,
        details={"employee_id": teacher.employee_id, "email": new_user.email}
    )

    return {"success": True, "message": "Teacher created successfully.", "data": {"id": teacher.id}}


# --- Teacher Subject Assignments ---
@router.get("/teacher-assignments")
def list_teacher_assignments(
    teacher_id: Optional[str] = Query(None),
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    query = db.query(TeacherSubjectAssignment)
    if teacher_id:
        query = query.filter(TeacherSubjectAssignment.teacher_id == teacher_id)
    assignments = query.all()

    return {
        "success": True,
        "data": [
            {
                "id": a.id,
                "teacher_id": a.teacher_id,
                "teacher_name": a.teacher.user.full_name if a.teacher and a.teacher.user else "",
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
    }


@router.post("/teacher-assignments", status_code=status.HTTP_201_CREATED)
def assign_teacher_subject(
    data: TeacherAssignmentCreate,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data

    existing = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == data.teacher_id,
        TeacherSubjectAssignment.subject_id == data.subject_id,
        TeacherSubjectAssignment.section_id == data.section_id,
        TeacherSubjectAssignment.semester_id == data.semester_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists.")

    assignment = TeacherSubjectAssignment(
        teacher_id=data.teacher_id,
        subject_id=data.subject_id,
        section_id=data.section_id,
        semester_id=data.semester_id
    )
    db.add(assignment)
    db.commit()

    return {"success": True, "message": "Subject assigned to teacher successfully.", "data": {"id": assignment.id}}


# --- Academic Management (Departments, Semesters, Sections, Subjects, Classrooms, Timetable) ---
@router.get("/academic-overview")
def get_academic_overview(
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    departments = db.query(Department).all()
    semesters = db.query(Semester).all()
    sections = db.query(Section).all()
    subjects = db.query(Subject).all()
    classrooms = db.query(Classroom).all()

    return {
        "success": True,
        "data": {
            "departments": [{"id": d.id, "code": d.code, "name": d.name} for d in departments],
            "semesters": [{"id": s.id, "semester_number": s.semester_number, "department_id": s.department_id} for s in semesters],
            "sections": [{"id": sec.id, "name": sec.name, "semester_id": sec.semester_id, "department_id": sec.department_id} for sec in sections],
            "subjects": [{"id": sub.id, "code": sub.code, "name": sub.name, "department_id": sub.department_id, "semester_number": sub.semester_number, "credits": sub.credits} for sub in subjects],
            "classrooms": [{"id": c.id, "room_number": c.room_number, "building": c.building, "capacity": c.capacity} for c in classrooms]
        }
    }


# --- Timetable Slots & Clash Detection ---
@router.get("/timetable-slots")
def list_admin_timetable_slots(
    semester_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    teacher_id: Optional[str] = Query(None),
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    query = db.query(TimetableSlot)
    if semester_id:
        query = query.filter(TimetableSlot.semester_id == semester_id)
    if section_id:
        query = query.filter(TimetableSlot.section_id == section_id)
    if teacher_id:
        query = query.filter(TimetableSlot.teacher_id == teacher_id)

    slots = query.order_by(TimetableSlot.day_of_week, TimetableSlot.start_time).all()
    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "day_of_week": s.day_of_week,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "slot_period": s.slot_period,
                "subject_id": s.subject_id,
                "subject_name": s.subject.name if s.subject else "",
                "subject_code": s.subject.code if s.subject else "",
                "teacher_id": s.teacher_id,
                "teacher_name": s.teacher.user.full_name if s.teacher and s.teacher.user else "",
                "classroom_id": s.classroom_id,
                "room_number": s.classroom.room_number if s.classroom else "",
                "section_id": s.section_id,
                "section_name": s.section.name if s.section else "",
                "semester_id": s.semester_id,
                "semester_number": s.semester.semester_number if s.semester else 1
            }
            for s in slots
        ]
    }


@router.post("/timetable-slots", status_code=status.HTTP_201_CREATED)
def create_timetable_slot(
    data: TimetableSlotCreate,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    """
    Creates a new timetable slot with strict clash detection:
    1. Classroom clash check: room cannot be booked by two classes at the same time.
    2. Faculty clash check: teacher cannot teach two classes at the same time.
    3. Section clash check: section cannot have two classes at the same time.
    """
    user, admin = auth_data

    # Check Classroom clash
    room_clash = db.query(TimetableSlot).filter(
        TimetableSlot.classroom_id == data.classroom_id,
        TimetableSlot.day_of_week == data.day_of_week,
        TimetableSlot.start_time < data.end_time,
        TimetableSlot.end_time > data.start_time
    ).first()
    if room_clash:
        room_name = room_clash.classroom.room_number if room_clash.classroom else "this room"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Classroom Clash: {room_name} is already booked on {data.day_of_week} ({room_clash.start_time}-{room_clash.end_time}) for {room_clash.subject.name if room_clash.subject else 'another class'}."
        )

    # Check Teacher clash
    teacher_clash = db.query(TimetableSlot).filter(
        TimetableSlot.teacher_id == data.teacher_id,
        TimetableSlot.day_of_week == data.day_of_week,
        TimetableSlot.start_time < data.end_time,
        TimetableSlot.end_time > data.start_time
    ).first()
    if teacher_clash:
        teacher_name = teacher_clash.teacher.user.full_name if teacher_clash.teacher and teacher_clash.teacher.user else "Faculty member"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Faculty Clash: {teacher_name} is already scheduled to teach {teacher_clash.subject.name if teacher_clash.subject else 'another class'} on {data.day_of_week} ({teacher_clash.start_time}-{teacher_clash.end_time})."
        )

    # Check Section clash
    section_clash = db.query(TimetableSlot).filter(
        TimetableSlot.section_id == data.section_id,
        TimetableSlot.day_of_week == data.day_of_week,
        TimetableSlot.start_time < data.end_time,
        TimetableSlot.end_time > data.start_time
    ).first()
    if section_clash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Section Clash: Section {section_clash.section.name if section_clash.section else ''} already has {section_clash.subject.name if section_clash.subject else 'a lecture'} on {data.day_of_week} ({section_clash.start_time}-{section_clash.end_time})."
        )

    slot = TimetableSlot(
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        slot_period=data.slot_period,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        classroom_id=data.classroom_id,
        section_id=data.section_id,
        semester_id=data.semester_id
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    AuditService.log(
        db=db,
        action="TIMETABLE_SLOT_CREATED",
        target_type="TIMETABLE_SLOT",
        user=user,
        target_id=slot.id,
        details={
            "day": slot.day_of_week,
            "start": slot.start_time,
            "end": slot.end_time,
            "subject_id": slot.subject_id
        }
    )

    return {"success": True, "message": "Timetable slot scheduled successfully with zero clashes.", "data": {"id": slot.id}}


@router.delete("/timetable-slots/{slot_id}")
def delete_timetable_slot(
    slot_id: str,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data
    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found.")

    db.delete(slot)
    db.commit()

    AuditService.log(
        db=db,
        action="TIMETABLE_SLOT_DELETED",
        target_type="TIMETABLE_SLOT",
        user=user,
        target_id=slot_id,
        details={"deleted_slot_id": slot_id}
    )

    return {"success": True, "message": "Timetable slot removed."}


# --- Notification Broadcast ---
@router.post("/notifications/broadcast")
def broadcast_notification(
    payload: dict,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data
    title = payload.get("title", "Department Notice")
    message = payload.get("message", "")
    category = payload.get("category", "SYSTEM_ALERT")
    target_role = payload.get("target_role", "ALL")

    if not message:
        raise HTTPException(status_code=400, detail="Notification message cannot be empty.")

    query = db.query(User).filter(User.is_active == True)
    if target_role == "STUDENT":
        query = query.filter(User.role == RoleEnum.STUDENT.value)
    elif target_role == "TEACHER":
        query = query.filter(User.role == RoleEnum.TEACHER.value)

    recipients = query.all()
    created_count = 0
    for r in recipients:
        notif = Notification(
            user_id=r.id,
            title=title,
            message=message,
            category=category,
            is_read=False
        )
        db.add(notif)
        created_count += 1

    db.commit()

    AuditService.log(
        db=db,
        action="NOTIFICATION_BROADCAST",
        target_type="NOTIFICATION",
        user=user,
        target_id="BROADCAST",
        details={"title": title, "recipients_count": created_count, "target_role": target_role}
    )

    return {
        "success": True,
        "message": f"Broadcast notification sent to {created_count} users successfully.",
        "data": {"count": created_count}
    }


# --- Semester Promotion ---
@router.post("/semester-promotion")
def promote_student_semester(
    data: SemesterPromotionRequest,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    """
    HOD/Admin promotes a student to the next semester.
    Old attendance is preserved, new semester starts, and promotion is logged.
    """
    user, admin = auth_data
    try:
        record = AcademicService.promote_student(
            db=db,
            admin_user=user,
            student_id=data.student_id,
            to_semester_id=data.to_semester_id,
            notes=data.notes
        )
        return {
            "success": True,
            "message": f"Student successfully promoted to Semester {record.to_semester.semester_number}.",
            "data": {
                "promotion_id": record.id,
                "final_attendance_percentage": record.final_attendance_percentage,
                "promotion_date": record.promotion_date.strftime("%Y-%m-%d")
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Attendance Policy Threshold ---
@router.get("/threshold")
def get_attendance_threshold(
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    threshold = AttendanceService.get_configured_threshold(db)
    return {"success": True, "threshold": threshold}


@router.post("/threshold")
def set_attendance_threshold(
    threshold: float = Query(..., ge=1.0, le=100.0),
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data
    config = db.query(SystemConfig).filter(SystemConfig.key == "ATTENDANCE_THRESHOLD").first()
    if not config:
        config = SystemConfig(key="ATTENDANCE_THRESHOLD", value=str(threshold), description="Minimum required attendance %")
        db.add(config)
    else:
        config.value = str(threshold)
    db.commit()

    AuditService.log(
        db=db,
        action="CONFIG_THRESHOLD_UPDATED",
        target_type="CONFIG",
        user=user,
        target_id="ATTENDANCE_THRESHOLD",
        details={"threshold": threshold}
    )

    return {"success": True, "message": f"Attendance threshold updated to {threshold}%."}


# --- Geofence Location Configuration ---
@router.get("/location")
def get_college_location(
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    loc = db.query(CollegeLocation).filter(CollegeLocation.is_active == True).first()
    if not loc:
        return {"success": True, "data": None}
    return {
        "success": True,
        "data": {
            "id": loc.id,
            "campus_name": loc.campus_name,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "radius_meters": loc.radius_meters,
            "is_active": loc.is_active
        }
    }


@router.post("/location")
def set_college_location(
    data: LocationConfigCreate,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data
    loc = db.query(CollegeLocation).filter(CollegeLocation.is_active == True).first()
    if not loc:
        loc = CollegeLocation(
            campus_name=data.campus_name,
            latitude=data.latitude,
            longitude=data.longitude,
            radius_meters=data.radius_meters,
            is_active=data.is_active
        )
        db.add(loc)
    else:
        loc.campus_name = data.campus_name
        loc.latitude = data.latitude
        loc.longitude = data.longitude
        loc.radius_meters = data.radius_meters
        loc.is_active = data.is_active
    db.commit()

    AuditService.log(
        db=db,
        action="LOCATION_CONFIG_UPDATED",
        target_type="CONFIG",
        user=user,
        target_id=loc.id,
        details={"lat": loc.latitude, "lon": loc.longitude, "radius": loc.radius_meters}
    )

    return {"success": True, "message": "College geofence location saved.", "data": {"id": loc.id}}


# --- Wi-Fi Configuration ---
@router.get("/wifi-networks")
def list_wifi_networks(
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    networks = db.query(CollegeWifiNetwork).all()
    return {
        "success": True,
        "data": [
            {
                "id": n.id,
                "ssid": n.ssid,
                "bssid": n.bssid,
                "building": n.building,
                "status": n.status
            }
            for n in networks
        ]
    }


@router.post("/wifi-networks", status_code=status.HTTP_201_CREATED)
def add_wifi_network(
    data: WifiConfigCreate,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data
    existing = db.query(CollegeWifiNetwork).filter(CollegeWifiNetwork.ssid == data.ssid).first()
    if existing:
        raise HTTPException(status_code=400, detail="Wi-Fi network with this SSID already exists.")

    net = CollegeWifiNetwork(
        ssid=data.ssid,
        bssid=data.bssid,
        building=data.building,
        status=data.status
    )
    db.add(net)
    db.commit()

    AuditService.log(
        db=db,
        action="WIFI_NETWORK_ADDED",
        target_type="CONFIG",
        user=user,
        target_id=net.id,
        details={"ssid": net.ssid, "building": net.building}
    )

    return {"success": True, "message": "Campus Wi-Fi network registered.", "data": {"id": net.id}}


# --- Audit Logs ---
@router.get("/audit-logs")
def list_audit_logs(
    limit: int = Query(50, le=200),
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

    return {
        "success": True,
        "data": [
            {
                "id": l.id,
                "user_email": l.user_email,
                "user_role": l.user_role,
                "action": l.action,
                "target_type": l.target_type,
                "target_id": l.target_id,
                "details": l.details,
                "ip_address": l.ip_address,
                "status": l.status,
                "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            }
            for l in logs
        ]
    }
