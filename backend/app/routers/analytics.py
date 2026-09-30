from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, Admin, Student
from app.models.academic import Subject, Department
from app.models.attendance import ClassSession, AttendanceRecord, AttendanceStatus
from app.dependencies import require_hod_admin
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics & Reports"])


@router.get("/overview")
def get_attendance_analytics(
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    """
    Returns real database aggregated analytics:
    - Subject average attendance
    - Distribution of student attendance ranges (>75%, 65-75%, <65%)
    - Daily attendance trend for past 7 days
    """
    user, admin = auth_data
    threshold = AttendanceService.get_configured_threshold(db)

    # 1. Subject Performance
    subjects = db.query(Subject).all()
    subject_stats = []
    for s in subjects:
        total_sessions = db.query(ClassSession).filter(ClassSession.subject_id == s.id).count()
        if total_sessions > 0:
            total_present = db.query(AttendanceRecord).join(ClassSession).filter(
                ClassSession.subject_id == s.id,
                AttendanceRecord.status == AttendanceStatus.PRESENT.value
            ).count()
            total_records = db.query(AttendanceRecord).join(ClassSession).filter(
                ClassSession.subject_id == s.id
            ).count()
            avg_pct = round((total_present / total_records * 100), 1) if total_records > 0 else 0.0
            subject_stats.append({
                "subject_code": s.code,
                "subject_name": s.name,
                "total_sessions": total_sessions,
                "average_percentage": avg_pct
            })

    # 2. Student Distribution
    students = db.query(Student).all()
    healthy_count = 0
    warning_count = 0
    critical_count = 0

    for stu in students:
        stats = AttendanceService.calculate_student_stats(db, stu.id)
        if stats.percentage >= threshold:
            healthy_count += 1
        elif stats.percentage >= threshold - 10.0:
            warning_count += 1
        else:
            critical_count += 1

    # 3. 7-Day Trend
    trend = []
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_str = day_date.strftime("%Y-%m-%d")
        day_name = day_date.strftime("%a")

        day_present = db.query(AttendanceRecord).join(ClassSession).filter(
            ClassSession.date == day_str,
            AttendanceRecord.status == AttendanceStatus.PRESENT.value
        ).count()

        trend.append({
            "date": day_str,
            "day": day_name,
            "present_count": day_present
        })

    return {
        "success": True,
        "data": {
            "distribution": {
                "healthy": healthy_count,
                "warning": warning_count,
                "critical": critical_count,
                "total": len(students)
            },
            "subject_performance": subject_stats,
            "attendance_trend": trend
        }
    }
