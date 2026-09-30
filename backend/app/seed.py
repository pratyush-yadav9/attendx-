import os
import sys
from datetime import datetime, date, timedelta

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, init_db
from app.dependencies import hash_password
from app.models.user import User, Student, Teacher, Admin, RoleEnum
from app.models.academic import (
    AcademicYear,
    Department,
    Semester,
    Section,
    Classroom,
    Subject,
    TeacherSubjectAssignment,
    TimetableSlot,
)
from app.models.attendance import (
    ClassSession,
    AttendanceRecord,
    SessionStatus,
    AttendanceStatus,
)
from app.models.config_models import CollegeLocation, CollegeWifiNetwork, SystemConfig
from app.models.notifications import Notification
from app.services.face_recognition_service import FaceRecognitionService


def seed_database():
    print("[Seed] Initializing database tables...")
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Admin).count() > 0:
            print("[Seed] Database already seeded. Skipping initial seed.")
            return

        print("[Seed] Seeding academic structure...")

        # 1. Academic Year
        academic_year = AcademicYear(year_name="2026-2027", is_current=True)
        db.add(academic_year)
        db.flush()

        # 2. Departments
        dept_cse = Department(code="CSE", name="Computer Science & Engineering")
        dept_ece = Department(code="ECE", name="Electronics & Communication Engineering")
        dept_it = Department(code="IT", name="Information Technology")
        db.add_all([dept_cse, dept_ece, dept_it])
        db.flush()

        # 3. Semesters (1 to 8 for CSE)
        semesters = {}
        for num in range(1, 9):
            sem = Semester(
                semester_number=num,
                department_id=dept_cse.id,
                academic_year_id=academic_year.id,
                is_active=(num == 3)  # Current active semester is 3
            )
            db.add(sem)
            semesters[num] = sem
        db.flush()

        # 4. Sections for Semester 3
        sec_a = Section(name="A", department_id=dept_cse.id, semester_id=semesters[3].id)
        sec_b = Section(name="B", department_id=dept_cse.id, semester_id=semesters[3].id)
        db.add_all([sec_a, sec_b])
        db.flush()

        # 5. Classrooms
        cr1 = Classroom(room_number="LH-101", building="Academic Block A", capacity=60)
        cr2 = Classroom(room_number="LH-102", building="Academic Block A", capacity=60)
        cr3 = Classroom(room_number="CS-LAB-1", building="Tech Block B", capacity=40)
        db.add_all([cr1, cr2, cr3])
        db.flush()

        # 6. Subjects for Semester 3
        sub_dsa = Subject(code="CS301", name="Data Structures & Algorithms", department_id=dept_cse.id, semester_number=3, credits=4)
        sub_os = Subject(code="CS302", name="Operating Systems", department_id=dept_cse.id, semester_number=3, credits=4)
        sub_dbms = Subject(code="CS303", name="Database Management Systems", department_id=dept_cse.id, semester_number=3, credits=4)
        sub_cn = Subject(code="CS304", name="Computer Networks", department_id=dept_cse.id, semester_number=3, credits=4)
        sub_se = Subject(code="CS305", name="Software Engineering & Agile", department_id=dept_cse.id, semester_number=3, credits=4)
        sub_algo = Subject(code="CS306", name="Design & Analysis of Algorithms", department_id=dept_cse.id, semester_number=3, credits=4)
        sub_web = Subject(code="CS307", name="Web Development & Cloud Computing", department_id=dept_cse.id, semester_number=3, credits=3)
        sub_ai = Subject(code="CS308", name="Artificial Intelligence & Machine Learning", department_id=dept_cse.id, semester_number=3, credits=4)
        sub_math = Subject(code="MA301", name="Discrete Mathematics", department_id=dept_cse.id, semester_number=3, credits=3)
        db.add_all([sub_dsa, sub_os, sub_dbms, sub_cn, sub_se, sub_algo, sub_web, sub_ai, sub_math])
        db.flush()

        # 7. HOD Admin Account
        print("[Seed] Creating HOD / Admin account...")
        hod_user = User(
            email="hod.cse@college.edu",
            hashed_password=hash_password("Password@123"),
            full_name="Dr. Rajesh Sharma",
            role=RoleEnum.HOD_ADMIN.value,
            is_active=True,
            is_verified=True,
            otp_secret="123456"
        )
        db.add(hod_user)
        db.flush()

        hod_admin = Admin(
            user_id=hod_user.id,
            employee_id="EMP-HOD-01",
            department_id=dept_cse.id,
            is_super_admin=True
        )
        db.add(hod_admin)
        db.flush()

        # 8. Teachers
        print("[Seed] Creating Teachers...")
        teacher1_user = User(
            email="prof.amit@college.edu",
            hashed_password=hash_password("Password@123"),
            full_name="Prof. Amit Sharma",
            role=RoleEnum.TEACHER.value,
            is_active=True,
            is_verified=True
        )
        db.add(teacher1_user)
        db.flush()

        teacher1 = Teacher(
            user_id=teacher1_user.id,
            employee_id="EMP-TCH-01",
            department_id=dept_cse.id,
            designation="Associate Professor",
            phone="+91 9876543210"
        )
        db.add(teacher1)
        db.flush()

        teacher2_user = User(
            email="prof.sneha@college.edu",
            hashed_password=hash_password("Password@123"),
            full_name="Prof. Sneha Gupta",
            role=RoleEnum.TEACHER.value,
            is_active=True,
            is_verified=True
        )
        db.add(teacher2_user)
        db.flush()

        teacher2 = Teacher(
            user_id=teacher2_user.id,
            employee_id="EMP-TCH-02",
            department_id=dept_cse.id,
            designation="Assistant Professor",
            phone="+91 9876543211"
        )
        db.add(teacher2)
        db.flush()

        # 9. Teacher Assignments
        assign1 = TeacherSubjectAssignment(teacher_id=teacher1.id, subject_id=sub_dsa.id, section_id=sec_a.id, semester_id=semesters[3].id)
        assign2 = TeacherSubjectAssignment(teacher_id=teacher1.id, subject_id=sub_os.id, section_id=sec_a.id, semester_id=semesters[3].id)
        assign3 = TeacherSubjectAssignment(teacher_id=teacher1.id, subject_id=sub_se.id, section_id=sec_a.id, semester_id=semesters[3].id)
        assign4 = TeacherSubjectAssignment(teacher_id=teacher1.id, subject_id=sub_algo.id, section_id=sec_a.id, semester_id=semesters[3].id)
        assign5 = TeacherSubjectAssignment(teacher_id=teacher1.id, subject_id=sub_web.id, section_id=sec_a.id, semester_id=semesters[3].id)
        assign6 = TeacherSubjectAssignment(teacher_id=teacher2.id, subject_id=sub_dbms.id, section_id=sec_a.id, semester_id=semesters[3].id)
        assign7 = TeacherSubjectAssignment(teacher_id=teacher2.id, subject_id=sub_cn.id, section_id=sec_a.id, semester_id=semesters[3].id)
        assign8 = TeacherSubjectAssignment(teacher_id=teacher2.id, subject_id=sub_ai.id, section_id=sec_a.id, semester_id=semesters[3].id)
        assign9 = TeacherSubjectAssignment(teacher_id=teacher2.id, subject_id=sub_math.id, section_id=sec_a.id, semester_id=semesters[3].id)
        db.add_all([assign1, assign2, assign3, assign4, assign5, assign6, assign7, assign8, assign9])
        db.flush()

        # 10. Students (20 CS Students)
        print("[Seed] Creating 20 Students for Computer Science Section A...")
        students_info = [
            ("2024CSE001", "01", "Aarav Kumar", "aarav.kumar@student.college.edu"),
            ("2024CSE002", "02", "Priya Patel", "priya.patel@student.college.edu"),
            ("2024CSE003", "03", "Rohan Sharma", "rohan.sharma@student.college.edu"),
            ("2024CSE004", "04", "Ananya Singh", "ananya.singh@student.college.edu"),
            ("2024CSE005", "05", "Vikram Malhotra", "vikram.malhotra@student.college.edu"),
            ("2024CSE006", "06", "Ishita Verma", "ishita.verma@student.college.edu"),
            ("2024CSE007", "07", "Siddharth Roy", "siddharth.roy@student.college.edu"),
            ("2024CSE008", "08", "Meera Iyer", "meera.iyer@student.college.edu"),
            ("2024CSE009", "09", "Aditya Nair", "aditya.nair@student.college.edu"),
            ("2024CSE010", "10", "Sneha Joshi", "sneha.joshi@student.college.edu"),
            ("2024CSE011", "11", "Rahul Gupta", "rahul.gupta@student.college.edu"),
            ("2024CSE012", "12", "Pooja Sen", "pooja.sen@student.college.edu"),
            ("2024CSE013", "13", "Karan Mehta", "karan.mehta@student.college.edu"),
            ("2024CSE014", "14", "Riya Choudhury", "riya.choudhury@student.college.edu"),
            ("2024CSE015", "15", "Varun Desai", "varun.desai@student.college.edu"),
            ("2024CSE016", "16", "Tanvi Shah", "tanvi.shah@student.college.edu"),
            ("2024CSE017", "17", "Nikhil Rao", "nikhil.rao@student.college.edu"),
            ("2024CSE018", "18", "Diya Bose", "diya.bose@student.college.edu"),
            ("2024CSE019", "19", "Arjun Reddy", "arjun.reddy@student.college.edu"),
            ("2024CSE020", "20", "Kavya Menon", "kavya.menon@student.college.edu"),
        ]

        seeded_students = []
        seeded_student_users = []
        for reg_no, roll_no, name, email in students_info:
            stu_u = User(
                email=email,
                hashed_password=hash_password("Password@123"),
                full_name=name,
                role=RoleEnum.STUDENT.value,
                is_active=True,
                is_verified=True
            )
            db.add(stu_u)
            db.flush()
            seeded_student_users.append(stu_u)

            photo_path = FaceRecognitionService.generate_student_portrait(name, reg_no, roll_no, "CSE")
            st_rec = Student(
                user_id=stu_u.id,
                registration_number=reg_no,
                roll_number=roll_no,
                department_id=dept_cse.id,
                semester_id=semesters[3].id,
                section_id=sec_a.id,
                academic_year_id=academic_year.id,
                photo_url=photo_path
            )
            db.add(st_rec)
            seeded_students.append(st_rec)
        db.flush()

        student1 = seeded_students[0]
        student2 = seeded_students[1]
        stu1_user = seeded_student_users[0]

        # 11. Timetable Slots (Monday - Saturday)
        print("[Seed] Generating weekly timetable...")
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        for d in days:
            slot1 = TimetableSlot(day_of_week=d, start_time="09:00", end_time="10:00", slot_period="Morning", subject_id=sub_dsa.id, teacher_id=teacher1.id, classroom_id=cr1.id, section_id=sec_a.id, semester_id=semesters[3].id)
            slot2 = TimetableSlot(day_of_week=d, start_time="10:00", end_time="11:00", slot_period="Morning", subject_id=sub_os.id, teacher_id=teacher1.id, classroom_id=cr1.id, section_id=sec_a.id, semester_id=semesters[3].id)
            slot3 = TimetableSlot(day_of_week=d, start_time="11:15", end_time="12:15", slot_period="Morning", subject_id=sub_dbms.id, teacher_id=teacher2.id, classroom_id=cr2.id, section_id=sec_a.id, semester_id=semesters[3].id)
            slot4 = TimetableSlot(day_of_week=d, start_time="13:00", end_time="14:00", slot_period="Afternoon", subject_id=sub_cn.id, teacher_id=teacher2.id, classroom_id=cr3.id, section_id=sec_a.id, semester_id=semesters[3].id)
            db.add_all([slot1, slot2, slot3, slot4])
        db.flush()

        # 12. College Location & Wi-Fi
        print("[Seed] Configuring college geofence & Wi-Fi...")
        college_loc = CollegeLocation(
            campus_name="AttendX Central Engineering Campus",
            latitude=28.6139,
            longitude=77.2090,
            radius_meters=200.0,
            is_active=True
        )
        db.add(college_loc)

        college_wifi = CollegeWifiNetwork(
            ssid="GEC_MADHUBANI_WIFI",
            bssid="00:14:22:01:23:45",
            building="Main Academic Complex",
            status="ACTIVE"
        )
        db.add(college_wifi)

        # 13. System Configurations
        threshold_cfg = SystemConfig(
            key="ATTENDANCE_THRESHOLD",
            value="75.0",
            description="Minimum required attendance percentage threshold"
        )
        db.add(threshold_cfg)
        db.flush()

        # 14. Seed Realistic Past Attendance Sessions & Records
        print("[Seed] Seeding realistic class sessions and attendance records...")
        today = date.today()
        # Seed 10 past sessions for DSA, 10 for OS, 10 for DBMS, 10 for CN
        subject_configs = [
            (sub_dsa, teacher1, 10, 8),  # 80% attendance
            (sub_os, teacher1, 10, 7),   # 70% attendance (below threshold -> generates warning)
            (sub_dbms, teacher2, 10, 9), # 90% attendance
            (sub_cn, teacher2, 10, 8),   # 80% attendance
        ]

        for subj, tch, total_cls, stu1_present_cls in subject_configs:
            for i in range(total_cls):
                past_date = today - timedelta(days=(total_cls - i + 1))
                sess = ClassSession(
                    teacher_id=tch.id,
                    subject_id=subj.id,
                    section_id=sec_a.id,
                    semester_id=semesters[3].id,
                    classroom_id=cr1.id,
                    date=past_date.strftime("%Y-%m-%d"),
                    start_time=datetime.combine(past_date, datetime.min.time()) + timedelta(hours=9),
                    end_time=datetime.combine(past_date, datetime.min.time()) + timedelta(hours=10),
                    status=SessionStatus.CLOSED.value
                )
                db.add(sess)
                db.flush()

                # Mark student 1 based on quota
                if i < stu1_present_cls:
                    rec1 = AttendanceRecord(
                        class_session_id=sess.id,
                        student_id=student1.id,
                        subject_id=subj.id,
                        semester_id=semesters[3].id,
                        status=AttendanceStatus.PRESENT.value,
                        verification_method="DYNAMIC_QR",
                        is_geofence_verified=True,
                        is_wifi_verified=True,
                        distance_meters=24.5,
                        marked_at=sess.start_time + timedelta(minutes=5)
                    )
                    db.add(rec1)

                # Student 2 attended all
                rec2 = AttendanceRecord(
                    class_session_id=sess.id,
                    student_id=student2.id,
                    subject_id=subj.id,
                    semester_id=semesters[3].id,
                    status=AttendanceStatus.PRESENT.value,
                    verification_method="DYNAMIC_QR",
                    is_geofence_verified=True,
                    is_wifi_verified=True,
                    distance_meters=31.2,
                    marked_at=sess.start_time + timedelta(minutes=6)
                )
                db.add(rec2)

        # Notification for student 1 (low attendance alert in OS)
        notif = Notification(
            user_id=stu1_user.id,
            title="Attendance Alert: Operating Systems",
            message="Your current Operating Systems (CS302) attendance is 70.0%. Required attendance is 75.0%. Please attend upcoming classes to avoid debarment.",
            category="ATTENDANCE_ALERT"
        )
        db.add(notif)

        db.commit()
        print("[Seed] Successfully seeded all AttendX database entities!")
        print("\n================ TEST CREDENTIALS ================")
        print("HOD / Admin:")
        print("  Email: hod.cse@college.edu")
        print("  Password: Password@123")
        print("  2FA OTP: 123456")
        print("Teacher:")
        print("  Email: prof.amit@college.edu")
        print("  Password: Password@123")
        print("Student:")
        print("  Email: aarav.kumar@student.college.edu")
        print("  Reg No: 2024CSE001")
        print("  Password: Password@123")
        print("==================================================\n")

    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
