import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserCheck, 
  History, 
  Search, 
  Save, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  BookOpen, 
  Users, 
  Check, 
  X,
  FileText,
  Filter,
  User,
  Sliders,
  ChevronDown,
  Camera
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  attendanceManagementService, 
  ClassOption, 
  TeacherOption,
  RosterData, 
  AttendanceAuditLogItem,
  StudentRosterItem
} from '../../services/attendanceManagementService';
import { FaceVerificationModal } from '../../components/FaceVerificationModal';

export const AdminAttendanceControlPage: React.FC = () => {
  const { user } = useAuth();

  // Tab State: 'REGISTER' | 'DATE_EDIT' | 'AUDIT'
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'DATE_EDIT' | 'AUDIT'>('DATE_EDIT');

  // Options & Selections
  const [allTeachers, setAllTeachers] = useState<TeacherOption[]>([]);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedClassIndex, setSelectedClassIndex] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Roster & Student State
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [studentStatuses, setStudentStatuses] = useState<{ [studentId: string]: 'PRESENT' | 'ABSENT' }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Loading & Action State
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Single Edit Modal State
  const [editingStudent, setEditingStudent] = useState<{
    student_id: string;
    student_name: string;
    current_status: string;
    target_status: 'PRESENT' | 'ABSENT';
  } | null>(null);
  const [editReason, setEditReason] = useState<string>('Attendance corrected by HOD / Department Admin');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Biometric Face Verification Modal State
  const [faceModalStudent, setFaceModalStudent] = useState<StudentRosterItem | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState<boolean>(false);

  // Audit History State
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // 1. Load Options on Mount
  useEffect(() => {
    loadOptions();
  }, []);

  // Filter classes by selected teacher if filtered
  const filteredClasses = allClasses.filter((c) => {
    if (selectedTeacherId === 'ALL') return true;
    return c.assigned_teacher_id === selectedTeacherId;
  });

  // 2. Load Roster whenever selected class or date changes
  useEffect(() => {
    if (filteredClasses.length > 0) {
      if (selectedClassIndex >= filteredClasses.length) {
        setSelectedClassIndex(0);
      } else {
        loadRoster();
      }
    } else {
      setRosterData(null);
    }
  }, [selectedClassIndex, selectedDate, selectedTeacherId, allClasses]);

  // 3. Load Audit History when Audit tab is activated or class changes
  useEffect(() => {
    if (activeTab === 'AUDIT') {
      loadAuditHistory();
    }
  }, [activeTab, selectedClassIndex, selectedTeacherId]);

  const loadOptions = async () => {
    setIsLoadingOptions(true);
    setErrorMsg(null);
    try {
      const data = await attendanceManagementService.getOptions();
      const loadedTeachers = Array.isArray(data?.teachers) ? data.teachers : [];
      const loadedClasses = Array.isArray(data?.classes) ? data.classes : [];
      setAllTeachers(loadedTeachers);
      setAllClasses(loadedClasses);
      if (loadedClasses.length > 0) {
        setSelectedClassIndex(0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load department attendance control options.');
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const loadRoster = async () => {
    if (!filteredClasses[selectedClassIndex]) return;
    const currentClass = filteredClasses[selectedClassIndex];

    setIsLoadingRoster(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const data = await attendanceManagementService.getRoster(
        currentClass.subject_id,
        currentClass.section_id,
        selectedDate,
        currentClass.assigned_teacher_id
      );
      setRosterData(data);

      // Initialize status mapping from existing records or default to PRESENT
      const initialMap: { [studentId: string]: 'PRESENT' | 'ABSENT' } = {};
      data.students.forEach((s) => {
        if (s.status === 'PRESENT') {
          initialMap[s.student_id] = 'PRESENT';
        } else if (s.status === 'ABSENT') {
          initialMap[s.student_id] = 'ABSENT';
        } else {
          initialMap[s.student_id] = 'PRESENT';
        }
      });
      setStudentStatuses(initialMap);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load attendance roster.');
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const loadAuditHistory = async () => {
    const currentClass = filteredClasses[selectedClassIndex];
    setIsLoadingAudit(true);
    try {
      const logs = await attendanceManagementService.getAuditHistory(
        currentClass?.subject_id,
        undefined,
        100
      );
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    if (!rosterData) return;
    const newMap: { [id: string]: 'PRESENT' | 'ABSENT' } = {};
    rosterData.students.forEach((s) => {
      newMap[s.student_id] = 'PRESENT';
    });
    setStudentStatuses(newMap);
  };

  // Quick Action: Mark All Absent
  const handleMarkAllAbsent = () => {
    if (!rosterData) return;
    const newMap: { [id: string]: 'PRESENT' | 'ABSENT' } = {};
    rosterData.students.forEach((s) => {
      newMap[s.student_id] = 'ABSENT';
    });
    setStudentStatuses(newMap);
  };

  // Individual Toggle
  const handleToggleStudent = (studentId: string) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT',
    }));
  };

  // Submit Bulk Register
  const handleSaveRegister = async () => {
    if (!filteredClasses[selectedClassIndex] || !rosterData) return;
    const currentClass = filteredClasses[selectedClassIndex];

    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    const records = Object.entries(studentStatuses).map(([student_id, status]) => ({
      student_id,
      status,
    }));

    try {
      const res = await attendanceManagementService.submitRegister({
        subject_id: currentClass.subject_id,
        section_id: currentClass.section_id,
        semester_id: currentClass.semester_id,
        date: selectedDate,
        teacher_id: currentClass.assigned_teacher_id,
        records,
        remarks: remarks || `Digital attendance submitted by HOD (${user?.full_name})`,
      });

      setSaveSuccessMsg(
        `Department attendance register saved for ${selectedDate}! (${res.present_count} Present, ${res.absent_count} Absent). Student attendance percentages recalculated.`
      );
      loadRoster();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit attendance register.');
    } finally {
      setIsSaving(false);
    }
  };

  // Single Student Quick Override (Date-wise edit tab)
  const handleOpenSingleEdit = (student: any, targetStatus: 'PRESENT' | 'ABSENT') => {
    setEditingStudent({
      student_id: student.student_id,
      student_name: student.full_name,
      current_status: student.status,
      target_status: targetStatus,
    });
    setEditReason('Attendance corrected by HOD / Department Admin');
  };

  const handleConfirmSingleEdit = async () => {
    if (!editingStudent || !filteredClasses[selectedClassIndex]) return;
    const currentClass = filteredClasses[selectedClassIndex];

    setIsSubmittingEdit(true);
    try {
      await attendanceManagementService.updateStudentStatus({
        session_id: rosterData?.session_id || undefined,
        subject_id: currentClass.subject_id,
        section_id: currentClass.section_id,
        date: selectedDate,
        student_id: editingStudent.student_id,
        status: editingStudent.target_status,
        reason: editReason,
      });

      setEditingStudent(null);
      setSaveSuccessMsg(
        `Successfully changed ${editingStudent.student_name} to ${editingStudent.target_status} on ${selectedDate}. Audit log entry recorded and student percentages updated.`
      );
      loadRoster();
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance status.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const selectedClass = filteredClasses[selectedClassIndex];

  // Filter students based on search query
  const filteredStudents = (rosterData?.students || []).filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.registration_number.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            HOD Departmental Attendance Control & Audit
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Attendance Register & Override Suite
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Department-wide attendance management: Correct attendance for any date, inspect roster roll calls, and audit changes transparently.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('DATE_EDIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'DATE_EDIT'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-attendx-navy'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Date-Wise Correction
          </button>
          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'REGISTER'
                ? 'bg-white text-attendx-blue shadow-sm'
                : 'text-slate-600 hover:text-attendx-navy'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Digital Register
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-attendx-navy'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Trail
          </button>
        </div>
      </div>

      {/* Control Panel / Filter Bar */}
      <div className="attendx-card p-5 bg-gradient-to-r from-purple-50/40 via-white to-blue-50/30 border-purple-200/70">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* 1. Faculty Filter */}
          <div>
            <label className="block text-[11px] font-bold text-attendx-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-600" />
              Filter by Faculty
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                setSelectedClassIndex(0);
              }}
              disabled={isLoadingOptions}
              className="attendx-input text-xs font-semibold text-attendx-navy w-full"
            >
              <option value="ALL">All Department Faculty ({allTeachers.length})</option>
              {allTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Class & Subject Selector */}
          <div>
            <label className="block text-[11px] font-bold text-attendx-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-attendx-blue" />
              Class & Subject
            </label>
            <select
              value={selectedClassIndex}
              onChange={(e) => setSelectedClassIndex(Number(e.target.value))}
              disabled={isLoadingOptions || filteredClasses.length === 0}
              className="attendx-input text-xs font-semibold text-attendx-navy w-full"
            >
              {filteredClasses.length === 0 ? (
                <option value={0}>No classes found</option>
              ) : (
                filteredClasses.map((c, idx) => (
                  <option key={`${c.subject_id}-${c.section_id}-${idx}`} value={idx}>
                    {c.subject_name} ({c.subject_code}) — Sec {c.section_name} {c.assigned_teacher_name ? `• ${c.assigned_teacher_name}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 3. Calendar Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-attendx-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
              Select Date for Correction
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="attendx-input text-xs font-semibold text-attendx-navy w-full"
            />
          </div>

          {/* 4. Search Filter */}
          <div>
            <label className="block text-[11px] font-bold text-attendx-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Search Student
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name, Reg No, Roll No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="attendx-input text-xs pl-8 w-full"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Selected Class Meta Banner */}
        {selectedClass && (
          <div className="mt-4 pt-3 border-t border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-attendx-navy">
                {selectedClass.subject_name} ({selectedClass.subject_code})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
                Section {selectedClass.section_name}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-attendx-blue font-bold text-[10px]">
                Semester {selectedClass.semester_number}
              </span>
              {selectedClass.assigned_teacher_name && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                  Instructor: {selectedClass.assigned_teacher_name}
                </span>
              )}
            </div>

            <div className="text-[11px] text-attendx-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Selected Date: <strong className="text-attendx-navy">{selectedDate}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Alert / Notification Feedback */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Badges */}
      {rosterData && activeTab !== 'AUDIT' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="attendx-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-attendx-blue flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-attendx-muted uppercase block">Total Enrolled</span>
              <span className="text-xl font-black text-attendx-navy">{rosterData.summary.total_students}</span>
            </div>
          </div>

          <div className="attendx-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-attendx-success flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-attendx-muted uppercase block">Present</span>
              <span className="text-xl font-black text-attendx-navy">
                {activeTab === 'REGISTER'
                  ? Object.values(studentStatuses).filter((v) => v === 'PRESENT').length
                  : rosterData.summary.present_count}
              </span>
            </div>
          </div>

          <div className="attendx-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-attendx-danger flex items-center justify-center font-bold">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-attendx-muted uppercase block">Absent</span>
              <span className="text-xl font-black text-attendx-navy">
                {activeTab === 'REGISTER'
                  ? Object.values(studentStatuses).filter((v) => v === 'ABSENT').length
                  : rosterData.summary.absent_count}
              </span>
            </div>
          </div>

          <div className="attendx-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-attendx-muted uppercase block">Attendance Rate</span>
              <span className="text-xl font-black text-purple-700">
                {rosterData.summary.total_students > 0
                  ? Math.round(
                      ((activeTab === 'REGISTER'
                        ? Object.values(studentStatuses).filter((v) => v === 'PRESENT').length
                        : rosterData.summary.present_count) /
                        rosterData.summary.total_students) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: DATE-WISE ATTENDANCE EDITING & CORRECTION */}
      {activeTab === 'DATE_EDIT' && (
        <div className="space-y-4">
          <div className="attendx-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-attendx-border">
              <div>
                <h2 className="text-base font-bold text-attendx-navy flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-purple-600" />
                  Date-Wise Student Records ({selectedDate})
                </h2>
                <p className="text-xs text-attendx-muted mt-0.5">
                  Select any student below to correct their attendance status for this date. Every modification logs an immutable audit trail.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-attendx-muted">
                  Showing {filteredStudents.length} of {rosterData?.students.length || 0} students
                </span>
              </div>
            </div>

            {isLoadingRoster ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-medium text-attendx-muted">Loading attendance records for {selectedDate}...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-attendx-muted">
                No students found for this class and search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-attendx-border bg-slate-50/70 text-attendx-muted font-bold uppercase text-[10px]">
                      <th className="py-3 px-3">Roll No</th>
                      <th className="py-3 px-3">Registration No</th>
                      <th className="py-3 px-3">Student Full Name</th>
                      <th className="py-3 px-3">Recorded Status</th>
                      <th className="py-3 px-3">Method / Marked At</th>
                      <th className="py-3 px-3 text-right">HOD Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st) => {
                      const isPresent = st.status === 'PRESENT';
                      const isAbsent = st.status === 'ABSENT';
                      const isUnmarked = st.status === 'UNMARKED';

                      return (
                        <tr key={st.student_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-attendx-navy">{st.roll_number}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{st.registration_number}</td>
                          <td className="py-3 px-3 font-bold text-attendx-navy">{st.full_name}</td>
                          <td className="py-3 px-3">
                            {isPresent && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-attendx-success border border-emerald-200 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> Present
                              </span>
                            )}
                            {isAbsent && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-attendx-danger border border-red-200 inline-flex items-center gap-1">
                                <X className="w-3 h-3" /> Absent
                              </span>
                            )}
                            {isUnmarked && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Unmarked
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {st.verification_method ? (
                              <span className="font-medium text-[11px] text-attendx-navy">
                                {st.verification_method.replace('_', ' ')} • {st.marked_at || 'Recorded'}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No verification record</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setFaceModalStudent(st);
                                  setIsFaceModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-attendx-blue bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 shadow-xs"
                                title={`Verify biometric face for ${st.full_name}`}
                              >
                                <Camera className="w-3.5 h-3.5" />
                                Verify Face
                              </button>

                              {isPresent ? (
                                <button
                                  onClick={() => handleOpenSingleEdit(st, 'ABSENT')}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Mark Absent
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenSingleEdit(st, 'PRESENT')}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Mark Present
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL ATTENDANCE REGISTER (ROLL-CALL) */}
      {activeTab === 'REGISTER' && (
        <div className="space-y-4">
          <div className="attendx-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-attendx-border">
              <div>
                <h2 className="text-base font-bold text-attendx-navy flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-attendx-blue" />
                  Digital Attendance Roll Call Register
                </h2>
                <p className="text-xs text-attendx-muted mt-0.5">
                  Take or finalize manual attendance without QR scanning. Use bulk toggles then modify individual students as needed.
                </p>
              </div>

              {/* Bulk Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllAbsent}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  Mark All Absent
                </button>
              </div>
            </div>

            {isLoadingRoster ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-medium text-attendx-muted">Compiling student register...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-attendx-muted">
                No students found for this class and search criteria.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredStudents.map((st) => {
                    const status = studentStatuses[st.student_id] || 'PRESENT';
                    const isPresent = status === 'PRESENT';

                    return (
                      <div
                        key={st.student_id}
                        onClick={() => handleToggleStudent(st.student_id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                          isPresent
                            ? 'bg-emerald-50/40 border-emerald-200/90 hover:bg-emerald-50/70 shadow-sm'
                            : 'bg-red-50/40 border-red-200/90 hover:bg-red-50/70 shadow-sm'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono text-[11px] font-bold text-attendx-navy">
                              {st.roll_number}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              • {st.registration_number}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-attendx-navy truncate">
                            {st.full_name}
                          </p>
                        </div>

                        {/* Status Toggle Button */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-transform active:scale-95 ${
                            isPresent
                              ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-md'
                              : 'bg-red-600 text-white shadow-red-200 shadow-md'
                          }`}
                        >
                          {isPresent ? <Check className="w-5 h-5 stroke-[2.5]" /> : <X className="w-5 h-5 stroke-[2.5]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Register Submission Bar */}
                <div className="pt-4 border-t border-attendx-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-1/2">
                    <input
                      type="text"
                      placeholder="Remarks (e.g. HOD review, approved makeup register)..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="attendx-input text-xs w-full"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      onClick={handleSaveRegister}
                      disabled={isSaving}
                      className="attendx-btn-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl shadow-md w-full sm:w-auto justify-center"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving Department Register...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save & Recalculate Register</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="attendx-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-attendx-border">
              <div>
                <h2 className="text-base font-bold text-attendx-navy flex items-center gap-2">
                  <History className="w-4 h-4 text-attendx-blue" />
                  Attendance Modification Audit Log
                </h2>
                <p className="text-xs text-attendx-muted mt-0.5">
                  Complete immutable audit history showing who modified attendance records, when it occurred, and the registered reason.
                </p>
              </div>

              <button
                onClick={loadAuditHistory}
                disabled={isLoadingAudit}
                className="attendx-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 rounded-xl self-start sm:self-auto"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                Refresh Logs
              </button>
            </div>

            {isLoadingAudit ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-medium text-attendx-muted">Fetching audit history...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-attendx-muted">
                No attendance manual modifications recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-attendx-border bg-slate-50 text-attendx-muted font-bold uppercase text-[10px]">
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Modified By</th>
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3">Subject / Date</th>
                      <th className="py-3 px-3">Change Transition</th>
                      <th className="py-3 px-3">Audit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-attendx-navy block">{log.changed_by}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase inline-block mt-0.5 ${
                            log.role === 'HOD_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-attendx-blue'
                          }`}>
                            {log.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-attendx-navy block">{log.student_name}</span>
                          <span className="font-mono text-slate-400 text-[10px]">{log.registration_number}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-attendx-navy block">{log.subject_name}</span>
                          <span className="font-mono text-slate-500 text-[10px]">{log.date}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              log.old_status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {log.old_status}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              log.new_status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {log.new_status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={log.reason}>
                          {log.reason || 'Manual modification recorded'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SINGLE STUDENT EDIT REASON MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-attendx-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-attendx-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-attendx-navy text-sm">HOD Attendance Override</h3>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 space-y-1.5 border border-slate-100">
                <p className="text-attendx-muted">Student:</p>
                <p className="font-bold text-attendx-navy text-sm">{editingStudent.student_name}</p>
                <div className="flex items-center gap-2 pt-1 font-bold">
                  <span className="text-attendx-muted">Changing status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    editingStudent.current_status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {editingStudent.current_status}
                  </span>
                  <span>→</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    editingStudent.target_status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {editingStudent.target_status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Target Date: <strong>{selectedDate}</strong>
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-attendx-muted uppercase mb-1">
                  Reason for Adjustment (Mandatory for Audit Trail)
                </label>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Provide legitimate reason (e.g. Medical certificate approved, On-duty clearance, HOD review)..."
                  className="attendx-input w-full text-xs"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-purple-900 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p>
                  This change will immediately recalculate the student's attendance percentage and create an immutable audit record under your HOD account.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-attendx-border">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="attendx-btn-secondary px-4 py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleEdit}
                disabled={isSubmittingEdit || !editReason.trim()}
                className="attendx-btn-primary px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                {isSubmittingEdit ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Confirm & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Face Verification Modal */}
      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        onClose={() => {
          setIsFaceModalOpen(false);
          setFaceModalStudent(null);
        }}
        student={faceModalStudent}
        subjectName={allClasses[selectedClassIndex]?.subject_name}
        sectionName={allClasses[selectedClassIndex]?.section_name}
        onVerified={(studentId) => {
          setStudentStatuses((prev) => ({ ...prev, [studentId]: 'PRESENT' }));
          setSaveSuccessMsg(`Biometric face verified for ${faceModalStudent?.full_name}! Marked as Present.`);
          loadRoster();
        }}
      />
    </div>
  );
};

