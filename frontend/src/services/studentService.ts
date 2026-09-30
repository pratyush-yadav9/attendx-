import { api } from './api';
import { 
  StudentDashboardData, 
  OverallAttendance, 
  TimetableGrouped,
  NotificationItem 
} from '../types';

export interface AttendanceHistoryItem {
  id: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  room_number: string;
  date: string;
  marked_at: string;
  status: string;
  verification_method: string;
  distance_meters?: number;
  is_geofence_verified: boolean;
  is_wifi_verified: boolean;
  photo_url?: string;
}

export interface AcademicHistoryItem {
  semester_number: number;
  percentage: number;
  promotion_date: string | null;
  status: string;
  notes: string | null;
}

export interface CorrectionRequestItem {
  id: string;
  subject_name: string;
  subject_code: string;
  date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_comments?: string;
  reviewed_at?: string;
  created_at: string;
}

export const studentService = {
  async getDashboard(): Promise<StudentDashboardData> {
    return api.get<StudentDashboardData>('/students/dashboard');
  },

  async getAttendanceStats(): Promise<OverallAttendance> {
    return api.get<OverallAttendance>('/students/attendance-stats');
  },

  async getTimetable(): Promise<TimetableGrouped> {
    return api.get<TimetableGrouped>('/students/timetable');
  },

  async getAttendanceHistory(params?: {
    subject_id?: string;
    date_filter?: string;
    semester_id?: string;
  }): Promise<AttendanceHistoryItem[]> {
    const query = new URLSearchParams();
    if (params?.subject_id) query.append('subject_id', params.subject_id);
    if (params?.date_filter) query.append('date_filter', params.date_filter);
    if (params?.semester_id) query.append('semester_id', params.semester_id);
    const qs = query.toString();
    return api.get<AttendanceHistoryItem[]>(`/students/attendance-history${qs ? `?${qs}` : ''}`);
  },

  async getAcademicHistory(): Promise<AcademicHistoryItem[]> {
    return api.get<AcademicHistoryItem[]>('/students/academic-history');
  },

  async getCorrectionRequests(): Promise<CorrectionRequestItem[]> {
    return api.get<CorrectionRequestItem[]>('/students/correction-requests');
  },

  async submitCorrectionRequest(data: {
    class_session_id: string;
    subject_id: string;
    reason: string;
  }): Promise<{ id: string; status: string }> {
    return api.post('/students/correction-requests', data);
  },
};
