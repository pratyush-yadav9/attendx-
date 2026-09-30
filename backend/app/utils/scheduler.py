from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import logging

logger = logging.getLogger("attendx.scheduler")
scheduler = BackgroundScheduler()


def check_low_attendance_job():
    """
    Scheduled job that scans student attendance across all subjects.
    Generates notification alerts when a student's attendance drops below threshold.
    """
    from app.database import SessionLocal
    from app.models.user import Student
    from app.models.academic import Subject, Semester
    from app.models.attendance import ClassSession, AttendanceRecord
    from app.models.notifications import Notification
    from app.config import settings

    db = SessionLocal()
    try:
        threshold = settings.DEFAULT_ATTENDANCE_THRESHOLD
        students = db.query(Student).all()

        for student in students:
            # Query all subjects for the student's current semester
            subjects = db.query(Subject).filter(
                Subject.semester_number == (
                    db.query(Semester.semester_number)
                    .filter(Semester.id == student.semester_id)
                    .scalar_subquery()
                )
            ).all()

            for subject in subjects:
                total_sessions = db.query(ClassSession).filter(
                    ClassSession.subject_id == subject.id,
                    ClassSession.section_id == student.section_id,
                    ClassSession.status.in_(["ACTIVE", "CLOSED"])
                ).count()

                if total_sessions >= 3:  # Only alert after meaningful sample size
                    present_count = db.query(AttendanceRecord).join(ClassSession).filter(
                        AttendanceRecord.student_id == student.id,
                        ClassSession.subject_id == subject.id,
                        AttendanceRecord.status == "PRESENT"
                    ).count()

                    percentage = round((present_count / total_sessions) * 100, 1)

                    if percentage < threshold:
                        # Check if notified in the last 24 hours
                        yesterday = datetime.utcnow() - timedelta(days=1)
                        existing_alert = db.query(Notification).filter(
                            Notification.user_id == student.user_id,
                            Notification.title.like(f"%{subject.name}%"),
                            Notification.created_at >= yesterday
                        ).first()

                        if not existing_alert:
                            notif = Notification(
                                user_id=student.user_id,
                                title=f"Low Attendance Alert: {subject.name}",
                                message=f"Your current attendance in {subject.name} ({subject.code}) is {percentage}%. "
                                        f"The minimum required threshold is {threshold}%. Please attend upcoming classes to avoid debarment.",
                                category="ATTENDANCE_ALERT"
                            )
                            db.add(notif)
                            db.commit()
                            logger.info(f"Generated low attendance alert for student {student.registration_number} in {subject.code}")

    except Exception as e:
        logger.error(f"Error executing check_low_attendance_job: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    if not scheduler.running:
        # Run every 6 hours
        scheduler.add_job(check_low_attendance_job, "interval", hours=6, id="attendance_threshold_check")
        scheduler.start()
        logger.info("AttendX background scheduler started successfully.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("AttendX background scheduler stopped.")
