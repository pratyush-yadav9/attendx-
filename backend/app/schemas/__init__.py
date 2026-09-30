from app.schemas.auth import (
    LoginRequest,
    HodInitialSetupRequest,
    HodOtpVerifyRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.user import (
    UserResponse,
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    TeacherCreate,
    TeacherUpdate,
    TeacherResponse,
    AdminResponse,
)
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearResponse,
    DepartmentCreate,
    DepartmentResponse,
    SemesterCreate,
    SemesterResponse,
    SectionCreate,
    SectionResponse,
    ClassroomCreate,
    ClassroomResponse,
    SubjectCreate,
    SubjectResponse,
    TeacherAssignmentCreate,
    TeacherAssignmentResponse,
    TimetableSlotCreate,
    TimetableSlotResponse,
)
from app.schemas.attendance import (
    StartSessionRequest,
    RefreshQRRequest,
    ClassSessionResponse,
    VerificationSessionInfo,
    MarkAttendanceRequest,
    AttendanceRecordResponse,
    OverallAttendanceStats,
    SubjectAttendanceStats,
    AttendanceCorrectionCreate,
    AttendanceCorrectionReview,
    AttendanceCorrectionResponse,
    SemesterPromotionRequest,
    SemesterPromotionResponse,
)
from app.schemas.notifications import (
    NotificationCreate,
    NotificationResponse,
    DeviceTokenRegister,
)
from app.schemas.config import (
    LocationConfigCreate,
    LocationConfigResponse,
    WifiConfigCreate,
    WifiConfigResponse,
    SystemConfigUpdate,
)
from app.schemas.audit import AuditLogResponse
