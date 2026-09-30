from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class StartSessionRequest(BaseModel):
    subject_id: str
    section_id: str
    semester_id: str
    classroom_id: str


class RefreshQRRequest(BaseModel):
    session_id: str


class ClassSessionResponse(BaseModel):
    id: str
    teacher_id: str
    teacher_name: Optional[str] = None
    subject_id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    section_id: str
    section_name: Optional[str] = None
    semester_id: str
    semester_number: Optional[int] = None
    classroom_id: str
    room_number: Optional[str] = None
    date: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    current_qr_token: Optional[str] = None
    qr_expires_at: Optional[datetime] = None
    qr_data_url: Optional[str] = None
    present_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class VerificationSessionInfo(BaseModel):
    session_id: str
    subject_name: str
    subject_code: str
    teacher_name: str
    room_number: str
    section_name: str
    semester_number: int
    date: str
    start_time: str
    status: str
    token_valid: bool
    requires_photo: bool = True
    requires_location: bool = True


class MarkAttendanceRequest(BaseModel):
    qr_token: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_base64: Optional[str] = None
    device_fingerprint: Optional[str] = None
    wifi_ssid: Optional[str] = None
    face_verified: Optional[bool] = False
    face_confidence: Optional[float] = None
    face_verification_token: Optional[str] = None


class AttendanceRecordResponse(BaseModel):
    id: str
    class_session_id: str
    student_id: str
    student_name: Optional[str] = None
    registration_number: Optional[str] = None
    subject_id: str
    subject_name: Optional[str] = None
    status: str
    distance_meters: Optional[float] = None
    is_geofence_verified: bool
    is_wifi_verified: bool
    marked_at: datetime
    photo_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class SubjectAttendanceStats(BaseModel):
    subject_id: str
    subject_code: str
    subject_name: str
    present: int
    total: int
    percentage: float
    required_percentage: float = 75.0
    status: str  # "healthy", "warning", "critical"
    classes_needed_to_reach_threshold: int


class OverallAttendanceStats(BaseModel):
    present: int
    total: int
    percentage: float
    required_percentage: float = 75.0
    status: str  # "Healthy Attendance", "Warning", "Low Attendance"
    shortage_classes: int
    subject_breakdown: List[SubjectAttendanceStats]


class AttendanceCorrectionCreate(BaseModel):
    class_session_id: str
    subject_id: str
    reason: str


class AttendanceCorrectionReview(BaseModel):
    status: str  # "APPROVED" or "REJECTED"
    reviewer_comments: Optional[str] = None


class AttendanceCorrectionResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    registration_number: Optional[str] = None
    class_session_id: str
    subject_id: str
    subject_name: Optional[str] = None
    class_date: Optional[str] = None
    requested_status: str
    reason: str
    status: str
    reviewer_comments: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SemesterPromotionRequest(BaseModel):
    student_id: str
    to_semester_id: str
    notes: Optional[str] = None


class SemesterPromotionResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    from_semester_number: int
    to_semester_number: int
    final_attendance_percentage: float
    promotion_date: datetime
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceRegisterItem(BaseModel):
    student_id: str
    status: str  # "PRESENT" or "ABSENT"


class SubmitRegisterRequest(BaseModel):
    subject_id: str
    section_id: str
    semester_id: Optional[str] = None
    classroom_id: Optional[str] = None
    date: str  # "YYYY-MM-DD"
    teacher_id: Optional[str] = None
    records: List[StudentAttendanceRegisterItem]
    remarks: Optional[str] = None


class UpdateStudentAttendanceRequest(BaseModel):
    session_id: Optional[str] = None
    subject_id: Optional[str] = None
    section_id: Optional[str] = None
    date: Optional[str] = None
    student_id: str
    status: str  # "PRESENT" or "ABSENT"
    reason: Optional[str] = "Manual attendance adjustment"


class FaceVerificationRequest(BaseModel):
    photo_base64: str
    registration_number: Optional[str] = None
    session_id: Optional[str] = None
    qr_token: Optional[str] = None


class StudentMatchDetails(BaseModel):
    student_name: str
    roll_number: str
    registration_number: str
    class_section: str
    department: str
    attendance_status: str
    attendance_percentage: Optional[float] = None
    registered_photo_url: Optional[str] = None


class FaceVerificationResponse(BaseModel):
    is_match: bool
    match_status: str  # "MATCH" or "NO_MATCH"
    confidence_score: float
    threshold: float
    message: str
    student: Optional[StudentMatchDetails] = None
    face_verification_token: Optional[str] = None


class RegisterFaceRequest(BaseModel):
    photo_base64: str
    registration_number: Optional[str] = None


