export type Role = 'STUDENT' | 'TEACHER' | 'HOD_ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  
  // Student-specific fields
  student_id?: string;
  registration_number?: string;
  roll_number?: string;
  department_id?: string;
  department_name?: string;
  department_code?: string;
  semester_id?: string;
  semester_number?: number;
  section_id?: string;
  section_name?: string;
  academic_year?: string;

  // Teacher-specific fields
  teacher_id?: string;
  employee_id?: string;
  designation?: string;
  phone?: string;

  // Admin-specific fields
  admin_id?: string;
  is_super_admin?: boolean;
}

export interface SubjectStats {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  present: number;
  total: number;
  percentage: number;
  required_percentage: number;
  status: 'healthy' | 'warning' | 'critical';
  classes_needed_to_reach_threshold: number;
}

export interface OverallAttendance {
  present: number;
  total: number;
  percentage: number;
  required_percentage: number;
  status: string;
  shortage_classes: number;
  subject_breakdown?: SubjectStats[];
}

export interface TodayClass {
  slot_id?: string;
  session_id?: string | null;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  room_number: string;
  start_time: string;
  end_time: string;
  status: 'Upcoming' | 'Live' | 'Completed' | 'Attendance Marked' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED';
  has_marked?: boolean;
  current_qr_token?: string | null;
  present_count?: number;
  section_id?: string;
  section_name?: string;
  semester_id?: string;
  semester_number?: number;
  classroom_id?: string;
}

export interface StudentDashboardData {
  student: {
    full_name: string;
    registration_number: string;
    roll_number: string;
    department: string;
    department_code: string;
    section: string;
    semester: number;
  };
  overall_attendance: OverallAttendance;
  today_classes: TodayClass[];
  next_class: TodayClass | null;
}

export interface ActiveTeacherSession {
  session_id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  section_name: string;
  semester_number: number;
  room_number: string;
  date: string;
  start_time: string;
  current_qr_token: string | null;
  qr_data_url: string | null;
  qr_expires_at: string | null;
  total_marked: number;
  status: string;
}

export interface TeacherDashboardData {
  teacher: {
    full_name: string;
    employee_id: string;
    department: string;
    designation: string;
  };
  active_session?: ActiveTeacherSession | null;
  assigned_subjects: {
    id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    section_id: string;
    section_name: string;
    semester_id: string;
    semester_number: number;
  }[];
  today_classes: TodayClass[];
}

export interface AdminDashboardStats {
  total_students: number;
  total_teachers: number;
  today_classes: number;
  average_attendance: number;
  students_below_threshold: number;
  configured_threshold: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  created_at: string;
}

export interface TimetableSlotItem {
  id: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  room_number: string;
  start_time: string;
  end_time: string;
  slot_period: string;
}

export interface TimetableGrouped {
  [day: string]: TimetableSlotItem[];
}

export interface VerificationSessionData {
  session_id: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  room_number: string;
  section_name: string;
  semester_number: number;
  date: string;
  start_time: string;
  status: string;
  token_valid: boolean;
  requires_photo: boolean;
  requires_location: boolean;
}

export interface AttendanceSuccessData {
  attendance_id: string;
  student_name: string;
  registration_number: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  room_number: string;
  date: string;
  marked_at: string;
  status: string;
  distance_meters?: number;
}

export interface LiveAttendee {
  record_id: string;
  student_id: string;
  student_name: string;
  registration_number: string;
  roll_number: string;
  marked_at: string;
  distance_meters?: number;
  is_geofence_verified: boolean;
  is_wifi_verified: boolean;
  photo_url?: string;
}

export interface LiveSessionAttendance {
  session_id: string;
  subject_name?: string;
  subject_code?: string;
  section_name?: string;
  room_number?: string;
  semester_number?: number;
  status: string;
  current_qr_token: string | null;
  qr_token?: string | null;
  qr_data_url?: string | null;
  qr_expires_at: string | null;
  total_marked: number;
  attendees: LiveAttendee[];
}

export interface TeacherSessionItem {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  section_id: string;
  section_name: string;
  semester_number: number;
  room_number: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSED';
  present_count: number;
  total_enrolled: number;
  current_qr_token?: string | null;
}

export interface TeacherCorrectionRequest {
  id: string;
  student_name: string;
  registration_number: string;
  roll_number: string;
  subject_name: string;
  subject_code: string;
  class_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  reviewer_comments?: string;
}

export interface StudentSessionReport {
  student_id: string;
  student_name: string;
  registration_number: string;
  roll_number: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  marked_at: string | null;
  verification_method?: string | null;
  distance_meters?: number | null;
  is_geofence_verified: boolean;
  is_wifi_verified: boolean;
  photo_url?: string | null;
}

export interface SessionDetailedReport {
  session: {
    id: string;
    subject_name: string;
    subject_code: string;
    section_name: string;
    room_number: string;
    date: string;
    start_time: string;
    end_time: string | null;
    status: string;
    present_count: number;
    total_enrolled: number;
    attendance_percentage: number;
  };
  students: StudentSessionReport[];
}

export interface StudentMatchDetails {
  student_name: string;
  roll_number: string;
  registration_number: string;
  class_section: string;
  department: string;
  attendance_status: string;
  attendance_percentage?: number;
  registered_photo_url?: string;
}

export interface FaceVerificationResult {
  is_match: boolean;
  match_status: 'MATCH' | 'NO_MATCH';
  confidence_score: number;
  threshold: number;
  message: string;
  student?: StudentMatchDetails;
  face_verification_token?: string;
}

