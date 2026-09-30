import { apiRequest } from './api';

export interface ClassOption {
  assignment_id?: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  section_id: string;
  section_name: string;
  semester_id?: string;
  semester_number: number;
  assigned_teacher_id?: string;
  assigned_teacher_name?: string;
}

export interface TeacherOption {
  id: string;
  name: string;
  email: string;
  employee_id: string;
}

export interface ManagementOptionsData {
  is_hod: boolean;
  teachers: TeacherOption[];
  classes: ClassOption[];
}

export interface StudentRosterItem {
  student_id: string;
  full_name: string;
  registration_number: string;
  roll_number: string;
  status: 'PRESENT' | 'ABSENT' | 'UNMARKED';
  record_id: string | null;
  verification_method: string | null;
  marked_at: string | null;
}

export interface RosterData {
  session_id: string | null;
  session_status: string | null;
  date: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  section: {
    id: string;
    name: string;
  };
  teacher_name: string;
  summary: {
    total_students: number;
    present_count: number;
    absent_count: number;
    unmarked_count: number;
  };
  students: StudentRosterItem[];
}

export interface SubmitRegisterPayload {
  subject_id: string;
  section_id: string;
  semester_id?: string;
  classroom_id?: string;
  date: string;
  teacher_id?: string;
  records: {
    student_id: string;
    status: 'PRESENT' | 'ABSENT';
  }[];
  remarks?: string;
}

export interface UpdateStudentStatusPayload {
  session_id?: string;
  subject_id?: string;
  section_id?: string;
  date?: string;
  student_id: string;
  status: 'PRESENT' | 'ABSENT';
  reason?: string;
}

export interface AttendanceAuditLogItem {
  id: string;
  action: string;
  changed_by: string;
  role: string;
  timestamp: string;
  student_name: string;
  registration_number: string;
  subject_name: string;
  date: string;
  old_status: string;
  new_status: string;
  reason: string;
}

export const attendanceManagementService = {
  async getOptions(): Promise<ManagementOptionsData> {
    const res = await apiRequest('/attendance-management/options');
    return (res?.classes !== undefined ? res : res?.data) || { is_hod: false, teachers: [], classes: [] };
  },

  async getRoster(
    subjectId: string,
    sectionId: string,
    date: string,
    teacherId?: string
  ): Promise<RosterData> {
    const params = new URLSearchParams({
      subject_id: subjectId,
      section_id: sectionId,
      date,
    });
    if (teacherId) {
      params.append('teacher_id', teacherId);
    }
    const res = await apiRequest(`/attendance-management/roster?${params.toString()}`);
    return (res?.students !== undefined ? res : res?.data) || {
      session_id: null,
      session_status: null,
      date,
      subject: { id: subjectId, name: '', code: '' },
      section: { id: sectionId, name: '' },
      teacher_name: '',
      summary: { total_students: 0, present_count: 0, absent_count: 0, unmarked_count: 0 },
      students: [],
    };
  },

  async submitRegister(payload: SubmitRegisterPayload): Promise<any> {
    const res = await apiRequest('/attendance-management/submit-register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data !== undefined ? res.data : res;
  },

  async updateStudentStatus(payload: UpdateStudentStatusPayload): Promise<any> {
    const res = await apiRequest('/attendance-management/update-student-status', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data !== undefined ? res.data : res;
  },

  async getAuditHistory(
    subjectId?: string,
    date?: string,
    limit: number = 50
  ): Promise<AttendanceAuditLogItem[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (subjectId) params.append('subject_id', subjectId);
    if (date) params.append('date', date);

    const res = await apiRequest(`/attendance-management/audit-history?${params.toString()}`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.history)) return res.history;
    if (Array.isArray(res?.data?.history)) return res.data.history;
    return [];
  },
};
