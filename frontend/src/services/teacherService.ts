import { api } from './api';
import { 
  TeacherDashboardData, 
  LiveSessionAttendance, 
  TeacherSessionItem, 
  TeacherCorrectionRequest, 
  SessionDetailedReport 
} from '../types';

export interface StartClassPayload {
  subject_id: string;
  section_id: string;
  semester_id: string;
  classroom_id: string;
  allowed_radius_meters?: number;
}

export interface StartClassResponse {
  session_id: string;
  subject_name: string;
  subject_code: string;
  section_name: string;
  room_number: string;
  qr_token: string;
  qr_data_url: string;
  expires_at: string;
  status: string;
  allowed_radius_meters?: number;
}


export interface RefreshQRResponse {
  session_id: string;
  qr_token: string;
  qr_data_url: string;
  expires_at: string;
}

export interface CloseClassResponse {
  session_id: string;
  status: string;
  present_count: number;
}

export const teacherService = {
  async getDashboard(): Promise<TeacherDashboardData> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const query = origin ? `?base_url=${encodeURIComponent(origin)}` : '';
    return api.get<TeacherDashboardData>(`/teachers/dashboard${query}`);
  },

  async startClass(data: StartClassPayload): Promise<StartClassResponse> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const query = origin ? `?base_url=${encodeURIComponent(origin)}` : '';
    return api.post<StartClassResponse>(`/teachers/classes/start${query}`, data);
  },

  async refreshQR(sessionId: string): Promise<RefreshQRResponse> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const query = origin ? `?base_url=${encodeURIComponent(origin)}` : '';
    return api.post<RefreshQRResponse>(`/teachers/classes/${sessionId}/refresh-qr${query}`);
  },

  async closeClass(sessionId: string): Promise<CloseClassResponse> {
    return api.post<CloseClassResponse>(`/teachers/classes/${sessionId}/close`);
  },

  async getLiveAttendance(sessionId: string): Promise<LiveSessionAttendance> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const query = origin ? `?base_url=${encodeURIComponent(origin)}` : '';
    return api.get<LiveSessionAttendance>(`/teachers/classes/${sessionId}/live${query}`);
  },

  async getSessions(): Promise<TeacherSessionItem[]> {
    return api.get<TeacherSessionItem[]>('/teachers/sessions');
  },

  async getSessionReport(sessionId: string): Promise<SessionDetailedReport> {
    return api.get<SessionDetailedReport>(`/teachers/sessions/${sessionId}/report`);
  },

  async getCorrectionRequests(): Promise<TeacherCorrectionRequest[]> {
    return api.get<TeacherCorrectionRequest[]>('/teachers/correction-requests');
  },

  async reviewCorrectionRequest(
    requestId: string, 
    data: { status: 'APPROVED' | 'REJECTED'; reviewer_comments?: string }
  ): Promise<{ id: string; status: string }> {
    return api.post(`/teachers/correction-requests/${requestId}/review`, data);
  }
};
