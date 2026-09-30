from datetime import datetime
from sqlalchemy.orm import Session
from app.models.user import Student, User
from app.models.academic import Semester, Department
from app.models.attendance import SemesterPromotion, AttendanceRecord, ClassSession
from app.models.notifications import Notification
from app.services.audit_service import AuditService
from app.services.attendance_service import AttendanceService


class AcademicService:
    @staticmethod
    def promote_student(
        db: Session,
        admin_user: User,
        student_id: str,
        to_semester_id: str,
        notes: str = None
    ) -> SemesterPromotion:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError("Student not found.")

        current_semester = db.query(Semester).filter(Semester.id == student.semester_id).first()
        next_semester = db.query(Semester).filter(Semester.id == to_semester_id).first()

        if not current_semester or not next_semester:
            raise ValueError("Invalid source or destination semester.")

        if next_semester.semester_number <= current_semester.semester_number:
            raise ValueError(f"Cannot promote backward or to same semester (Current: {current_semester.semester_number}, Target: {next_semester.semester_number}).")

        # Compute final attendance percentage for the completed semester
        stats = AttendanceService.calculate_student_stats(db, student.id)
        final_percentage = stats.percentage

        # Record promotion in academic history
        promotion_record = SemesterPromotion(
            student_id=student.id,
            from_semester_id=current_semester.id,
            to_semester_id=next_semester.id,
            promoted_by=admin_user.id,
            final_attendance_percentage=final_percentage,
            promotion_date=datetime.utcnow(),
            notes=notes
        )
        db.add(promotion_record)

        # Update student current semester
        student.semester_id = next_semester.id
        db.commit()
        db.refresh(promotion_record)

        # Create Student Notification
        notif = Notification(
            user_id=student.user_id,
            title=f"Semester Promotion: Promoted to Semester {next_semester.semester_number}",
            message=f"Congratulations! You have been promoted from Semester {current_semester.semester_number} to Semester {next_semester.semester_number}. "
                    f"Your completed semester attendance of {final_percentage}% has been preserved in your academic history.",
            category="SEMESTER_PROMOTION"
        )
        db.add(notif)
        db.commit()

        # Audit Log
        AuditService.log(
            db=db,
            action="SEMESTER_PROMOTION",
            target_type="STUDENT",
            user=admin_user,
            target_id=student.id,
            details={
                "registration_number": student.registration_number,
                "from_semester": current_semester.semester_number,
                "to_semester": next_semester.semester_number,
                "final_attendance_percentage": final_percentage,
                "notes": notes
            }
        )

        return promotion_record
