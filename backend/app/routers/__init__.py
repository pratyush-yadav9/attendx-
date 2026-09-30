from app.routers.auth import router as auth_router
from app.routers.students import router as students_router
from app.routers.teachers import router as teachers_router
from app.routers.attendance import router as attendance_router
from app.routers.admin import router as admin_router
from app.routers.notifications import router as notifications_router
from app.routers.timetable import router as timetable_router
from app.routers.analytics import router as analytics_router
from app.routers.attendance_management import router as attendance_management_router

__all__ = [
    "auth_router",
    "students_router",
    "teachers_router",
    "attendance_router",
    "admin_router",
    "notifications_router",
    "timetable_router",
    "analytics_router",
    "attendance_management_router",
]

