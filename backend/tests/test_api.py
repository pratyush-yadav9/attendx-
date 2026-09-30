import pytest
import os
import sys
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import SessionLocal
from app.models.user import User, Student, Teacher, Admin
from app.models.academic import Subject, Section, Semester, Classroom
from app.models.attendance import ClassSession, AttendanceRecord, SessionStatus, SemesterPromotion
import io
import base64
from PIL import Image
from app.dependencies import create_access_token, generate_dynamic_qr_token


def get_test_photo_b64(reg_number="2024CSE001"):
    db = SessionLocal()
    student = db.query(Student).filter(Student.registration_number == reg_number).first()
    if student and student.photo_url:
        path = student.photo_url.lstrip("/")
        if os.path.exists(path):
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            db.close()
            return "data:image/jpeg;base64," + b64
    db.close()
    buf = io.BytesIO()
    img = Image.new("RGB", (128, 128), color=(37, 99, 235))
    img.save(buf, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

client = TestClient(app)


def test_root_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_initial_setup_locked():
    """Admin bootstrap must be locked once an administrator exists."""
    res = client.get("/api/v1/auth/initial-setup-status")
    assert res.status_code == 200
    data = res.json()
    assert data["is_locked"] is True

    # Attempting to create an admin when one exists must return 403 Forbidden
    res_post = client.post("/api/v1/auth/initial-hod-setup", json={
        "email": "hacker@evil.com",
        "password": "Password@123",
        "full_name": "Fake Admin",
        "employee_id": "EMP-FAKE-99"
    })
    assert res_post.status_code == 403
    assert res_post.json()["success"] is False


def test_student_login_valid():
    res = client.post("/api/v1/auth/login", json={
        "username": "2024CSE001",
        "password": "Password@123"
    })
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["role"] == "STUDENT"
    assert "access_token" in body["data"]
    assert body["data"]["user"]["registration_number"] == "2024CSE001"


def test_student_login_invalid_password():
    res = client.post("/api/v1/auth/login", json={
        "username": "2024CSE001",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    assert res.json()["success"] is False


def test_hod_login_with_otp():
    # Step 1: Login triggers 2FA OTP prompt
    res = client.post("/api/v1/auth/login", json={
        "username": "hod.cse@college.edu",
        "password": "Password@123"
    })
    assert res.status_code == 200
    body = res.json()
    assert body["data"]["require_otp"] is True
    temp_user_id = body["data"]["temp_user_id"]

    # Step 2: Verify OTP
    res_otp = client.post("/api/v1/auth/verify-otp", json={
        "user_id": temp_user_id,
        "otp_code": "123456"
    })
    assert res_otp.status_code == 200
    otp_body = res_otp.json()
    assert otp_body["success"] is True
    assert otp_body["data"]["role"] == "HOD_ADMIN"
    assert "access_token" in otp_body["data"]


def test_rbac_student_cannot_access_hod_admin():
    # Login as student
    res = client.post("/api/v1/auth/login", json={
        "username": "2024CSE001",
        "password": "Password@123"
    })
    token = res.json()["data"]["access_token"]

    # Try accessing admin dashboard stats
    res_admin = client.get("/api/v1/admin/dashboard-stats", headers={
        "Authorization": f"Bearer {token}"
    })
    assert res_admin.status_code == 403
    assert res_admin.json()["success"] is False


def test_rbac_student_cannot_access_teacher_apis():
    # Login as student
    res = client.post("/api/v1/auth/login", json={
        "username": "2024CSE001",
        "password": "Password@123"
    })
    token = res.json()["data"]["access_token"]

    # Try starting a teacher class session
    res_start = client.post("/api/v1/teachers/classes/start", json={
        "subject_id": "dummy",
        "section_id": "dummy",
        "semester_id": "dummy",
        "classroom_id": "dummy"
    }, headers={
        "Authorization": f"Bearer {token}"
    })
    assert res_start.status_code == 403
    assert res_start.json()["success"] is False


def test_student_dashboard_and_stats():
    res = client.post("/api/v1/auth/login", json={
        "username": "2024CSE001",
        "password": "Password@123"
    })
    token = res.json()["data"]["access_token"]

    res_dash = client.get("/api/v1/students/dashboard", headers={
        "Authorization": f"Bearer {token}"
    })
    assert res_dash.status_code == 200
    data = res_dash.json()["data"]
    assert "overall_attendance" in data
    assert "today_classes" in data
    assert data["student"]["registration_number"] == "2024CSE001"
    # Attendance % is a real calculated float, not hardcoded
    assert isinstance(data["overall_attendance"]["percentage"], (int, float))


def test_dynamic_qr_generation_and_verification_flow():
    # 1. Login as teacher
    res_tch = client.post("/api/v1/auth/login", json={
        "username": "prof.amit@college.edu",
        "password": "Password@123"
    })
    tch_token = res_tch.json()["data"]["access_token"]

    # 2. Get teacher dashboard to find assigned subject & section
    res_dash = client.get("/api/v1/teachers/dashboard", headers={
        "Authorization": f"Bearer {tch_token}"
    })
    subjects = res_dash.json()["data"]["assigned_subjects"]
    assert len(subjects) > 0
    assigned = subjects[0]

    # Get a classroom
    db = SessionLocal()
    classroom = db.query(Classroom).first()
    db.close()

    # 3. Teacher starts class session
    res_start = client.post("/api/v1/teachers/classes/start", json={
        "subject_id": assigned["subject_id"],
        "section_id": assigned["section_id"],
        "semester_id": assigned["semester_id"],
        "classroom_id": classroom.id
    }, headers={
        "Authorization": f"Bearer {tch_token}"
    })
    assert res_start.status_code in (200, 201)
    session_data = res_start.json()["data"]
    session_id = session_data["session_id"]
    qr_token = session_data["qr_token"]
    assert qr_token is not None

    # 4. Student scans QR: public verification lookup endpoint
    res_verify = client.get(f"/api/v1/attendance/verify/{qr_token}")
    assert res_verify.status_code == 200
    assert res_verify.json()["data"]["token_valid"] is True
    assert res_verify.json()["data"]["session_id"] == session_id

    # 5. Teacher closes class session
    res_close = client.post(f"/api/v1/teachers/classes/{session_id}/close", headers={
        "Authorization": f"Bearer {tch_token}"
    })
    assert res_close.status_code == 200
    assert res_close.json()["data"]["status"] == "CLOSED"

    # 6. Once closed, QR verification must fail
    res_verify_closed = client.get(f"/api/v1/attendance/verify/{qr_token}")
    assert res_verify_closed.status_code == 400
    assert res_verify_closed.json()["success"] is False


def test_anti_proxy_attendance_and_duplicate_prevention():
    # 1. Login Teacher and start a new live class
    res_tch = client.post("/api/v1/auth/login", json={
        "username": "prof.sneha@college.edu",
        "password": "Password@123"
    })
    tch_token = res_tch.json()["data"]["access_token"]

    db = SessionLocal()
    subject = db.query(Subject).filter(Subject.code == "CS303").first()
    section = db.query(Section).filter(Section.name == "A").first()
    semester = db.query(Semester).filter(Semester.semester_number == 3).first()
    classroom = db.query(Classroom).first()
    student = db.query(Student).filter(Student.registration_number == "2024CSE001").first()
    
    subject_id = subject.id
    section_id = section.id
    semester_id = semester.id
    classroom_id = classroom.id

    if student and subject:
        db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.subject_id == subject.id
        ).delete()
        db.commit()
    db.close()

    res_start = client.post("/api/v1/teachers/classes/start", json={
        "subject_id": subject_id,
        "section_id": section_id,
        "semester_id": semester_id,
        "classroom_id": classroom_id
    }, headers={"Authorization": f"Bearer {tch_token}"})
    assert res_start.status_code in (200, 201)
    qr_token = res_start.json()["data"]["qr_token"]

    # 2. Login as Student Aarav
    res_stu = client.post("/api/v1/auth/login", json={
        "username": "2024CSE001",
        "password": "Password@123"
    })
    stu_token = res_stu.json()["data"]["access_token"]

    test_photo_b64 = get_test_photo_b64()

    # 3. Mark attendance with valid campus coordinate (28.6139, 77.2090)
    res_mark = client.post("/api/v1/attendance/mark", json={
        "qr_token": qr_token,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "photo_base64": test_photo_b64
    }, headers={"Authorization": f"Bearer {stu_token}"})
    assert res_mark.status_code == 201
    assert res_mark.json()["success"] is True
    assert "Attendance marked successfully" in res_mark.json()["message"]

    # 4. Attempt duplicate attendance submission for same session -> MUST be rejected
    res_dup = client.post("/api/v1/attendance/mark", json={
        "qr_token": qr_token,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "photo_base64": test_photo_b64
    }, headers={"Authorization": f"Bearer {stu_token}"})
    assert res_dup.status_code == 400
    assert "already been marked" in res_dup.json()["message"]


def test_geofence_rejection_outside_campus():
    # Login Teacher
    res_tch = client.post("/api/v1/auth/login", json={
        "username": "prof.sneha@college.edu",
        "password": "Password@123"
    })
    tch_token = res_tch.json()["data"]["access_token"]

    db = SessionLocal()
    subject = db.query(Subject).filter(Subject.code == "CS304").first()
    section = db.query(Section).filter(Section.name == "A").first()
    semester = db.query(Semester).filter(Semester.semester_number == 3).first()
    classroom = db.query(Classroom).first()
    student = db.query(Student).filter(Student.registration_number == "2024CSE002").first()
    if student and semester:
        student.semester_id = semester.id
        db.commit()
    sub_id = subject.id
    sec_id = section.id
    sem_id = semester.id
    cls_id = classroom.id
    db.close()

    res_start = client.post("/api/v1/teachers/classes/start", json={
        "subject_id": sub_id,
        "section_id": sec_id,
        "semester_id": sem_id,
        "classroom_id": cls_id
    }, headers={"Authorization": f"Bearer {tch_token}"})
    qr_token = res_start.json()["data"]["qr_token"]

    # Login Student Priya
    res_stu = client.post("/api/v1/auth/login", json={
        "username": "2024CSE002",
        "password": "Password@123"
    })
    stu_token = res_stu.json()["data"]["access_token"]

    test_photo_b64 = get_test_photo_b64()

    # Student provides coordinates 50km away (e.g. 28.9000, 77.9000)
    res_far = client.post("/api/v1/attendance/mark", json={
        "qr_token": qr_token,
        "latitude": 28.9000,
        "longitude": 77.9000,
        "photo_base64": test_photo_b64
    }, headers={"Authorization": f"Bearer {stu_token}"})
    assert res_far.status_code == 400
    assert "outside the allowed college attendance area" in res_far.json()["message"]


def test_notifications_endpoint():
    res_stu = client.post("/api/v1/auth/login", json={
        "username": "2024CSE001",
        "password": "Password@123"
    })
    stu_token = res_stu.json()["data"]["access_token"]

    res_notif = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {stu_token}"})
    assert res_notif.status_code == 200
    data = res_notif.json()
    assert data["success"] is True
    assert "data" in data
    assert isinstance(data["data"], list)


def test_teacher_live_qr_and_report_flow():
    # Login as teacher
    res_tch = client.post("/api/v1/auth/login", json={
        "username": "prof.amit@college.edu",
        "password": "Password@123"
    })
    tch_token = res_tch.json()["data"]["access_token"]

    # Get assignment
    res_dash = client.get("/api/v1/teachers/dashboard", headers={"Authorization": f"Bearer {tch_token}"})
    assigned = res_dash.json()["data"]["assigned_subjects"][0]

    db = SessionLocal()
    classroom = db.query(Classroom).first()
    db.close()

    # Start class
    res_start = client.post("/api/v1/teachers/classes/start", json={
        "subject_id": assigned["subject_id"],
        "section_id": assigned["section_id"],
        "semester_id": assigned["semester_id"],
        "classroom_id": classroom.id
    }, headers={"Authorization": f"Bearer {tch_token}"})
    session_id = res_start.json()["data"]["session_id"]

    # Refresh QR
    res_refresh = client.post(f"/api/v1/teachers/classes/{session_id}/refresh-qr", headers={"Authorization": f"Bearer {tch_token}"})
    assert res_refresh.status_code == 200
    new_qr = res_refresh.json()["data"]["qr_token"]
    assert new_qr is not None

    # Poll live attendance feed
    res_live = client.get(f"/api/v1/teachers/classes/{session_id}/live", headers={"Authorization": f"Bearer {tch_token}"})
    assert res_live.status_code == 200
    assert "attendees" in res_live.json()["data"]

    # Get teacher sessions list
    res_sessions = client.get("/api/v1/teachers/sessions", headers={"Authorization": f"Bearer {tch_token}"})
    assert res_sessions.status_code == 200
    assert len(res_sessions.json()["data"]) > 0

    # Get session detailed report
    res_report = client.get(f"/api/v1/teachers/sessions/{session_id}/report", headers={"Authorization": f"Bearer {tch_token}"})
    assert res_report.status_code == 200
    assert "students" in res_report.json()["data"]

    # Close session
    res_close = client.post(f"/api/v1/teachers/classes/{session_id}/close", headers={"Authorization": f"Bearer {tch_token}"})
    assert res_close.status_code == 200


def get_hod_token():
    res = client.post("/api/v1/auth/login", json={
        "username": "hod.cse@college.edu",
        "password": "Password@123"
    })
    temp_user_id = res.json()["data"]["temp_user_id"]
    res_otp = client.post("/api/v1/auth/verify-otp", json={
        "user_id": temp_user_id,
        "otp_code": "123456"
    })
    return res_otp.json()["data"]["access_token"]


def test_admin_timetable_clash_detection():
    hod_token = get_hod_token()

    db = SessionLocal()
    classroom = db.query(Classroom).first()
    teacher = db.query(Teacher).first()
    subject = db.query(Subject).first()
    section = db.query(Section).first()
    semester = db.query(Semester).first()
    
    c_id = classroom.id
    t_id = teacher.id
    sub_id = subject.id
    sec_id = section.id
    sem_id = semester.id
    db.close()

    # Schedule a slot on Friday 14:00-15:00
    res_first = client.post("/api/v1/admin/timetable-slots", json={
        "day_of_week": "Friday",
        "start_time": "14:00",
        "end_time": "15:00",
        "slot_period": "Period 5",
        "subject_id": sub_id,
        "teacher_id": t_id,
        "classroom_id": c_id,
        "section_id": sec_id,
        "semester_id": sem_id
    }, headers={"Authorization": f"Bearer {hod_token}"})
    assert res_first.status_code in (201, 409)

    # Attempt to schedule overlapping slot with SAME classroom -> MUST return 409 Conflict
    res_clash = client.post("/api/v1/admin/timetable-slots", json={
        "day_of_week": "Friday",
        "start_time": "14:30",
        "end_time": "15:30",
        "slot_period": "Period 6",
        "subject_id": sub_id,
        "teacher_id": t_id,
        "classroom_id": c_id,
        "section_id": sec_id,
        "semester_id": sem_id
    }, headers={"Authorization": f"Bearer {hod_token}"})
    assert res_clash.status_code == 409
    err_text = res_clash.json().get("message") or res_clash.json().get("detail", "")
    assert "Clash" in err_text


def test_admin_semester_promotion_and_preservation():
    hod_token = get_hod_token()

    db = SessionLocal()
    student = db.query(Student).filter(Student.registration_number == "2024CSE002").first()
    sem_3 = db.query(Semester).filter(Semester.semester_number == 3).first()
    sem_4 = db.query(Semester).filter(Semester.semester_number == 4).first()
    
    if student and sem_3:
        student.semester_id = sem_3.id
        db.query(SemesterPromotion).filter(SemesterPromotion.student_id == student.id).delete()
        db.commit()

    st_id = student.id
    target_sem_id = sem_4.id
    db.close()

    # Promote student
    res_promote = client.post("/api/v1/admin/semester-promotion", json={
        "student_id": st_id,
        "to_semester_id": target_sem_id,
        "notes": "Promoted to Term 4 under regulatory attendance compliance."
    }, headers={"Authorization": f"Bearer {hod_token}"})
    assert res_promote.status_code == 200
    data = res_promote.json()
    assert data["success"] is True
    assert "final_attendance_percentage" in data["data"]

    # Verify student is now in semester 4
    db = SessionLocal()
    st_updated = db.query(Student).filter(Student.id == st_id).first()
    assert st_updated.semester_id == target_sem_id
    db.close()


def test_admin_notification_broadcast():
    hod_token = get_hod_token()

    res_bcast = client.post("/api/v1/admin/notifications/broadcast", json={
        "title": "Semester Examination Schedule Published",
        "message": "The final timetable and hall tickets have been uploaded to AttendX.",
        "category": "EXAM_ALERT",
        "target_role": "ALL"
    }, headers={"Authorization": f"Bearer {hod_token}"})
    assert res_bcast.status_code == 200
    assert res_bcast.json()["success"] is True
    assert res_bcast.json()["data"]["count"] > 0


def get_teacher_token():
    res = client.post("/api/v1/auth/login", json={
        "username": "prof.amit@college.edu",
        "password": "Password@123"
    })
    return res.json()["data"]["access_token"]


def test_attendance_management_options():
    # 1. Teacher options
    tch_token = get_teacher_token()
    res_tch = client.get("/api/v1/attendance-management/options", headers={"Authorization": f"Bearer {tch_token}"})
    assert res_tch.status_code == 200
    data_tch = res_tch.json()["data"]
    assert data_tch["is_hod"] is False
    assert len(data_tch["classes"]) > 0

    # 2. HOD options
    hod_token = get_hod_token()
    res_hod = client.get("/api/v1/attendance-management/options", headers={"Authorization": f"Bearer {hod_token}"})
    assert res_hod.status_code == 200
    data_hod = res_hod.json()["data"]
    assert data_hod["is_hod"] is True
    assert len(data_hod["teachers"]) > 0
    assert len(data_hod["classes"]) > 0


def test_attendance_management_roster_and_digital_register():
    tch_token = get_teacher_token()
    hod_token = get_hod_token()

    # Get a class
    res_options = client.get("/api/v1/attendance-management/options", headers={"Authorization": f"Bearer {tch_token}"})
    cls_opt = res_options.json()["data"]["classes"][0]
    subject_id = cls_opt["subject_id"]
    section_id = cls_opt["section_id"]
    test_date = "2026-09-30"

    # Fetch initial roster
    res_roster = client.get(
        f"/api/v1/attendance-management/roster?subject_id={subject_id}&section_id={section_id}&date={test_date}",
        headers={"Authorization": f"Bearer {tch_token}"}
    )
    assert res_roster.status_code == 200
    roster_data = res_roster.json()["data"]
    students = roster_data["students"]
    assert len(students) > 0

    # Submit Digital Attendance Register (Mark all present except the first one absent)
    records = []
    for idx, st in enumerate(students):
        status_val = "ABSENT" if idx == 0 else "PRESENT"
        records.append({"student_id": st["student_id"], "status": status_val})

    res_submit = client.post("/api/v1/attendance-management/submit-register", json={
        "subject_id": subject_id,
        "section_id": section_id,
        "date": test_date,
        "records": records,
        "remarks": "Test digital register roll call submission"
    }, headers={"Authorization": f"Bearer {tch_token}"})

    assert res_submit.status_code == 200
    res_submit_data = res_submit.json()["data"]
    assert res_submit_data["present_count"] == len(students) - 1
    assert res_submit_data["absent_count"] == 1

    # Reload roster to verify statuses are saved
    res_roster_updated = client.get(
        f"/api/v1/attendance-management/roster?subject_id={subject_id}&section_id={section_id}&date={test_date}",
        headers={"Authorization": f"Bearer {tch_token}"}
    )
    assert res_roster_updated.status_code == 200
    upd_students = res_roster_updated.json()["data"]["students"]
    assert upd_students[0]["status"] == "ABSENT"
    if len(upd_students) > 1:
        assert upd_students[1]["status"] == "PRESENT"


def test_attendance_management_date_wise_edit_and_audit_history():
    hod_token = get_hod_token()

    # Get class options
    res_options = client.get("/api/v1/attendance-management/options", headers={"Authorization": f"Bearer {hod_token}"})
    cls_opt = res_options.json()["data"]["classes"][0]
    subject_id = cls_opt["subject_id"]
    section_id = cls_opt["section_id"]
    test_date = "2026-09-30"

    # Get roster to pick student 0
    res_roster = client.get(
        f"/api/v1/attendance-management/roster?subject_id={subject_id}&section_id={section_id}&date={test_date}",
        headers={"Authorization": f"Bearer {hod_token}"}
    )
    first_student = res_roster.json()["data"]["students"][0]
    target_student_id = first_student["student_id"]
    initial_status = first_student["status"]
    new_status = "PRESENT" if initial_status == "ABSENT" else "ABSENT"
    test_reason = "HOD medical leave approved override"

    # Update student status date-wise
    res_update = client.post("/api/v1/attendance-management/update-student-status", json={
        "subject_id": subject_id,
        "section_id": section_id,
        "date": test_date,
        "student_id": target_student_id,
        "status": new_status,
        "reason": test_reason
    }, headers={"Authorization": f"Bearer {hod_token}"})

    assert res_update.status_code == 200
    upd_data = res_update.json()["data"]
    assert upd_data["status"] == new_status
    assert "updated_attendance_percentage" in upd_data

    # Verify audit history includes this change
    res_audit = client.get(
        f"/api/v1/attendance-management/audit-history?subject_id={subject_id}&date={test_date}",
        headers={"Authorization": f"Bearer {hod_token}"}
    )
    assert res_audit.status_code == 200
    audit_logs = res_audit.json()["data"]["history"]
    assert len(audit_logs) > 0
    matching_log = next((l for l in audit_logs if l["reason"] == test_reason), None)
    assert matching_log is not None
    assert matching_log["old_status"] == initial_status
    assert matching_log["new_status"] == new_status
    assert matching_log["role"] == "HOD_ADMIN"


def test_student_attendance_percentage_updates_immediately_on_override():
    # 1. Login as Student Aarav
    res_stu = client.post("/api/v1/auth/login", json={
        "username": "2024CSE001",
        "password": "Password@123"
    })
    stu_token = res_stu.json()["data"]["access_token"]
    student_id = res_stu.json()["data"]["user"]["id"]

    # Student initial stats
    res_init = client.get("/api/v1/students/dashboard", headers={"Authorization": f"Bearer {stu_token}"})
    assert res_init.status_code == 200
    init_present = res_init.json()["data"]["overall_attendance"]["present"]
    init_total = res_init.json()["data"]["overall_attendance"]["total"]

    # 2. HOD updates student status for a new session on 2026-09-21 to PRESENT
    hod_token = get_hod_token()
    res_options = client.get("/api/v1/attendance-management/options", headers={"Authorization": f"Bearer {hod_token}"})
    cls_opt = res_options.json()["data"]["classes"][0]

    res_override = client.post("/api/v1/attendance-management/update-student-status", json={
        "subject_id": cls_opt["subject_id"],
        "section_id": cls_opt["section_id"],
        "date": "2026-09-21",
        "student_id": student_id,
        "status": "PRESENT",
        "reason": "Administrative attendance regularization"
    }, headers={"Authorization": f"Bearer {hod_token}"})
    assert res_override.status_code == 200

    # 3. Student immediately fetches dashboard again -> attendance stats must be updated
    res_after = client.get("/api/v1/students/dashboard", headers={"Authorization": f"Bearer {stu_token}"})
    assert res_after.status_code == 200
    after_present = res_after.json()["data"]["overall_attendance"]["present"]
    assert after_present >= init_present

    # 4. Verify hierarchical record model in DB:
    # Student -> Date -> Class/Section -> Subject -> Teacher -> Status
    db = SessionLocal()
    st_obj = db.query(Student).filter((Student.id == student_id) | (Student.user_id == student_id)).first()
    assert st_obj is not None
    rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == st_obj.id,
        AttendanceRecord.subject_id == cls_opt["subject_id"]
    ).order_by(AttendanceRecord.marked_at.desc()).first()
    assert rec is not None
    assert rec.status == "PRESENT"
    assert rec.class_session is not None
    assert rec.class_session.date == "2026-09-21"
    assert rec.class_session.section_id == cls_opt["section_id"]
    assert rec.class_session.subject_id == cls_opt["subject_id"]
    assert rec.class_session.teacher_id is not None
    db.close()


def test_face_recognition_verify_match():
    """Tests facial recognition returns MATCH, high confidence, and all 6 required fields."""
    stu_photo_b64 = get_test_photo_b64("2024CSE001")
    res = client.post("/api/v1/attendance/verify-face", json={
        "photo_base64": stu_photo_b64,
        "registration_number": "2024CSE001"
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_match"] is True
    assert data["match_status"] == "MATCH"
    assert data["confidence_score"] >= 65.0
    assert data["face_verification_token"] is not None

    student = data["student"]
    assert student is not None
    # Verify all 6 requested fields:
    # 1. Student Name
    assert student["student_name"] == "Aarav Kumar"
    # 2. Roll Number
    assert student["roll_number"] == "01"
    # 3. Registration/Student ID
    assert student["registration_number"] == "2024CSE001"
    # 4. Class/Section
    assert "Section" in student["class_section"]
    # 5. Department
    assert "Computer Science" in student["department"]
    # 6. Attendance status
    assert "Attendance" in student["attendance_status"] or "Eligible" in student["attendance_status"]


def test_face_recognition_verify_no_match():
    """Tests facial recognition detects mismatched photo and returns NO_MATCH."""
    # Student 2 photo submitted for Student 1 registration ID
    stu2_photo_b64 = get_test_photo_b64("2024CSE002")
    res = client.post("/api/v1/attendance/verify-face", json={
        "photo_base64": stu2_photo_b64,
        "registration_number": "2024CSE001"
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_match"] is False
    assert data["match_status"] == "NO_MATCH"
    assert data["confidence_score"] < 65.0
    assert data["face_verification_token"] is None






