import { api } from './api';
import { AdminDashboardStats } from '../types';

export interface AdminStudentItem {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  registration_number: string;
  roll_number: string;
  department_id: string;
  department_name: string;
  semester_id: string;
  semester_number: number;
  section_id: string;
  section_name: string;
  attendance_percentage: number;
  attendance_status: string;
  is_active: boolean;
  photo_url?: string | null;
  academic_year_id?: string;
}

export interface AdminTeacherItem {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  employee_id: string;
  department_id: string;
  department_name: string;
  designation: string;
  phone?: string;
  is_active: boolean;
}

export interface AcademicOverview {
  departments: { id: string; code: string; name: string }[];
  semesters: { id: string; semester_number: number; department_id: string }[];
  sections: { id: string; name: string; semester_id: string; department_id: string }[];
  subjects: { id: string; code: string; name: string; department_id: string; semester_number: number; credits: number }[];
  classrooms: { id: string; room_number: string; building: string; capacity: number }[];
}

export interface LocationConfig {
  id?: string;
  campus_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface WifiNetworkItem {
  id: string;
  ssid: string;
  bssid?: string;
  building: string;
  status: string;
}

export interface AdminTimetableSlot {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_period: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_id: string;
  teacher_name: string;
  classroom_id: string;
  room_number: string;
  section_id: string;
  section_name: string;
  semester_id: string;
  semester_number: number;
}

export interface AuditLogItem {
  id: string;
  user_email: string;
  user_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  status: string;
  timestamp: string;
}

export const adminService = {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    return api.get<AdminDashboardStats>('/admin/dashboard-stats');
  },

  async getStudents(params?: {
    department_id?: string;
    semester_id?: string;
    section_id?: string;
  }): Promise<AdminStudentItem[]> {
    const query = new URLSearchParams();
    if (params?.department_id) query.append('department_id', params.department_id);
    if (params?.semester_id) query.append('semester_id', params.semester_id);
    if (params?.section_id) query.append('section_id', params.section_id);
    const qs = query.toString();
    return api.get<AdminStudentItem[]>(`/admin/students${qs ? `?${qs}` : ''}`);
  },

  async createStudent(data: {
    email: string;
    password: string;
    full_name: string;
    registration_number: string;
    roll_number: string;
    department_id: string;
    semester_id: string;
    section_id: string;
    academic_year_id: string;
    photo_base64?: string;
  }): Promise<{ id: string; registration_number: string; photo_url?: string }> {
    return api.post('/admin/students', data);
  },

  async getStudent(studentId: string): Promise<AdminStudentItem> {
    return api.get<AdminStudentItem>(`/admin/students/${studentId}`);
  },

  async updateStudent(
    studentId: string, 
    data: {
      full_name?: string;
      email?: string;
      roll_number?: string;
      registration_number?: string;
      department_id?: string;
      semester_id?: string;
      section_id?: string;
      photo_base64?: string;
      is_active?: boolean;
    }
  ): Promise<AdminStudentItem> {
    return api.put<AdminStudentItem>(`/admin/students/${studentId}`, data);
  },

  async getTeachers(params?: { department_id?: string }): Promise<AdminTeacherItem[]> {
    const query = new URLSearchParams();
    if (params?.department_id) query.append('department_id', params.department_id);
    const qs = query.toString();
    return api.get<AdminTeacherItem[]>(`/admin/teachers${qs ? `?${qs}` : ''}`);
  },

  async createTeacher(data: {
    email: string;
    password: string;
    full_name: string;
    employee_id: string;
    department_id: string;
    designation: string;
    phone?: string;
  }): Promise<{ id: string }> {
    return api.post('/admin/teachers', data);
  },

  async getAcademicOverview(): Promise<AcademicOverview> {
    return api.get<AcademicOverview>('/admin/academic-overview');
  },

  async promoteStudent(data: {
    student_id: string;
    to_semester_id: string;
    notes?: string;
  }): Promise<{ promotion_id: string; final_attendance_percentage: number; promotion_date: string }> {
    return api.post('/admin/semester-promotion', data);
  },

  async getThreshold(): Promise<number> {
    const res = await api.get<{ threshold: number }>('/admin/threshold');
    return res.threshold;
  },

  async setThreshold(threshold: number): Promise<{ message: string }> {
    return api.post(`/admin/threshold?threshold=${threshold}`);
  },

  async getLocation(): Promise<LocationConfig | null> {
    return api.get<LocationConfig | null>('/admin/location');
  },

  async setLocation(data: LocationConfig): Promise<{ id: string }> {
    return api.post('/admin/location', data);
  },

  async getWifiNetworks(): Promise<WifiNetworkItem[]> {
    return api.get<WifiNetworkItem[]>('/admin/wifi-networks');
  },

  async addWifiNetwork(data: {
    ssid: string;
    bssid?: string;
    building: string;
    status: string;
  }): Promise<{ id: string }> {
    return api.post('/admin/wifi-networks', data);
  },

  async getTimetableSlots(params?: {
    semester_id?: string;
    section_id?: string;
    teacher_id?: string;
  }): Promise<AdminTimetableSlot[]> {
    const query = new URLSearchParams();
    if (params?.semester_id) query.append('semester_id', params.semester_id);
    if (params?.section_id) query.append('section_id', params.section_id);
    if (params?.teacher_id) query.append('teacher_id', params.teacher_id);
    const qs = query.toString();
    return api.get<AdminTimetableSlot[]>(`/admin/timetable-slots${qs ? `?${qs}` : ''}`);
  },

  async createTimetableSlot(data: {
    day_of_week: string;
    start_time: string;
    end_time: string;
    slot_period: string;
    subject_id: string;
    teacher_id: string;
    classroom_id: string;
    section_id: string;
    semester_id: string;
  }): Promise<{ id: string }> {
    return api.post('/admin/timetable-slots', data);
  },

  async deleteTimetableSlot(slotId: string): Promise<{ message: string }> {
    return api.delete(`/admin/timetable-slots/${slotId}`);
  },

  async getAuditLogs(limit: number = 50): Promise<AuditLogItem[]> {
    return api.get<AuditLogItem[]>(`/admin/audit-logs?limit=${limit}`);
  },

  async broadcastNotification(data: {
    title: string;
    message: string;
    category?: string;
    target_role?: string;
  }): Promise<{ count: number }> {
    return api.post('/admin/notifications/broadcast', data);
  }
};
