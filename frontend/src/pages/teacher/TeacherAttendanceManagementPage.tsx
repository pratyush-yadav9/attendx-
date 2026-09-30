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
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  attendanceManagementService, 
  ClassOption, 
  RosterData, 
  AttendanceAuditLogItem 
} from '../../services/attendanceManagementService';

export const TeacherAttendanceManagementPage: React.FC = () => {
  const { user } = useAuth();

  // Tab State: 'REGISTER' | 'DATE_EDIT' | 'AUDIT'
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'DATE_EDIT' | 'AUDIT'>('REGISTER');

  // Options & Selections
  const [classes, setClasses] = useState<ClassOption[]>([]);
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
  const [editReason, setEditReason] = useState<string>('Verified student presence in class');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Audit History State
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // 1. Load Classes Options on Mount
  useEffect(() => {
    loadOptions();
  }, []);

  // 2. Load Roster whenever selected class or date changes
  useEffect(() => {
    if (classes.length > 0) {
      loadRoster();
    }
  }, [selectedClassIndex, selectedDate, classes]);

  // 3. Load Audit History when Audit tab is activated
  useEffect(() => {
    if (activeTab === 'AUDIT') {
      loadAuditHistory();
    }
  }, [activeTab, selectedClassIndex]);

  const loadOptions = async () => {
    setIsLoadingOptions(true);
    setErrorMsg(null);
    try {
      const data = await attendanceManagementService.getOptions();
      const loadedClasses = Array.isArray(data?.classes) ? data.classes : [];
      setClasses(loadedClasses);
      if (loadedClasses.length > 0) {
        setSelectedClassIndex(0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load assigned classes.');
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const loadRoster = async () => {
    if (!classes[selectedClassIndex]) return;
    const currentClass = classes[selectedClassIndex];

    setIsLoadingRoster(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const data = await attendanceManagementService.getRoster(
        currentClass.subject_id,
        currentClass.section_id,
        selectedDate
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
          // If unmarked, default to PRESENT for fast roll-call
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
    const currentClass = classes[selectedClassIndex];
    setIsLoadingAudit(true);
    try {
      const logs = await attendanceManagementService.getAuditHistory(
        currentClass?.subject_id,
        undefined,
        50
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
    if (!classes[selectedClassIndex] || !rosterData) return;
    const currentClass = classes[selectedClassIndex];

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
        records,
        remarks: remarks || 'Digital register manual roll call',
      });

      setSaveSuccessMsg(
        `Attendance successfully saved for ${selectedDate}! (${res.present_count} Present, ${res.absent_count} Absent)`
      );
      // Reload roster to reflect saved timestamps
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
    setEditReason('Manual attendance verification & adjustment');
  };

  const handleConfirmSingleEdit = async () => {
    if (!editingStudent || !classes[selectedClassIndex]) return;
    const currentClass = classes[selectedClassIndex];

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
        `Updated ${editingStudent.student_name} to ${editingStudent.target_status}. Audit record created.`
      );
      loadRoster();
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance status.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const selectedClass = classes[selectedClassIndex];

  // Filter students based on search query
  const filteredStudents = (rosterData?.students || []).filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.registration_number.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q)
    );
  });

  // Calculate live counts from local state in Register mode
  const currentPresentCount = Object.values(studentStatuses).filter((st) => st === 'PRESENT').length;
  const currentAbsentCount = Object.values(studentStatuses).filter((st) => st === 'ABSENT').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
              Faculty Portal
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-attendx-blue">
              Attendance Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-1">
            Digital Register & Date-Wise Records
          </h1>
          <p className="text-xs text-attendx-muted mt-0.5">
            Conduct manual roll calls without QR codes, correct past date records, and maintain transparent audit trails.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'REGISTER'
                ? 'bg-white text-attendx-navy shadow-sm'
                : 'text-slate-600 hover:text-attendx-navy'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 text-attendx-blue" />
            Digital Register
          </button>
          <button
            onClick={() => setActiveTab('DATE_EDIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'DATE_EDIT'
                ? 'bg-white text-attendx-navy shadow-sm'
                : 'text-slate-600 hover:text-attendx-navy'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-attendx-cyan" />
            Date-Wise Edit
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'AUDIT'
                ? 'bg-white text-attendx-navy shadow-sm'
                : 'text-slate-600 hover:text-attendx-navy'
            }`}
          >
            <History className="w-4 h-4 text-purple-600" />
            Audit History
          </button>
        </div>
      </div>

      {/* Filter Selector Bar (Class & Date) */}
      <div className="attendx-card p-5 bg-gradient-to-r from-white via-white to-blue-50/40 border-blue-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Class / Subject Selector */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-attendx-navy mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-attendx-blue" />
              Select Assigned Subject & Section
            </label>
            {isLoadingOptions ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : classes.length === 0 ? (
              <div className="text-xs text-red-500 font-semibold p-2">No assigned subjects found.</div>
            ) : (
              <select
                value={selectedClassIndex}
                onChange={(e) => setSelectedClassIndex(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-attendx-border bg-white text-attendx-navy focus:outline-none focus:ring-2 focus:ring-attendx-blue"
              >
                {classes.map((cls, idx) => (
                  <option key={idx} value={idx}>
                    {cls.subject_name} ({cls.subject_code}) — Section {cls.section_name} (Sem {cls.semester_number})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-attendx-navy mb-1.5 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-attendx-blue" />
              Attendance Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-attendx-border bg-white text-attendx-navy focus:outline-none focus:ring-2 focus:ring-attendx-blue"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-attendx-blue text-white border-attendx-blue shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setSelectedDate(y.toISOString().split('T')[0]);
              }}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl border bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              Yesterday
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-attendx-danger text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DIGITAL ATTENDANCE REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'REGISTER' && (
        <div className="space-y-6">
          {/* Quick Actions & Live Stats Ribbon */}
          <div className="attendx-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-attendx-blue flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-attendx-muted block">Enrolled</span>
                  <span className="text-xl font-black text-attendx-navy">{rosterData?.summary.total_students || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-attendx-success flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Marked Present</span>
                  <span className="text-xl font-black text-emerald-800">{currentPresentCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-attendx-danger flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-red-700 block">Marked Absent</span>
                  <span className="text-xl font-black text-red-800">{currentAbsentCount}</span>
                </div>
              </div>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleMarkAllPresent}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                Mark All Present
              </button>
              <button
                onClick={handleMarkAllAbsent}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4 text-red-600" />
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Student Register Table */}
          <div className="attendx-card overflow-hidden">
            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter student by name, reg no, or roll no..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-attendx-blue"
                />
              </div>
              <span className="text-xs text-attendx-muted">
                Showing {filteredStudents.length} of {rosterData?.students.length || 0} students
              </span>
            </div>

            {/* Table */}
            {isLoadingRoster ? (
              <div className="p-12 text-center text-attendx-muted">
                <div className="w-8 h-8 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading digital attendance roster...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-attendx-muted space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">No students found for this class.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4 w-16">Roll No</th>
                      <th className="py-3 px-4">Student Information</th>
                      <th className="py-3 px-4">Registration ID</th>
                      <th className="py-3 px-4 text-center">Status on {selectedDate}</th>
                      <th className="py-3 px-4 text-right">Quick Roll Call Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => {
                      const isPresent = studentStatuses[student.student_id] === 'PRESENT';
                      return (
                        <tr key={student.student_id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {student.roll_number || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-attendx-navy block">{student.full_name}</span>
                            <span className="text-[11px] text-attendx-muted">Section {selectedClass?.section_name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {student.registration_number}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                                isPresent
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}
                            >
                              {isPresent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {isPresent ? 'PRESENT' : 'ABSENT'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                              <button
                                type="button"
                                onClick={() =>
                                  setStudentStatuses((prev) => ({ ...prev, [student.student_id]: 'PRESENT' }))
                                }
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-emerald-700'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStudentStatuses((prev) => ({ ...prev, [student.student_id]: 'ABSENT' }))
                                }
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                  !isPresent
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-red-700'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Register Submission Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:max-w-md">
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks (e.g. Regular lecture attendance roll call)..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-attendx-blue"
                />
              </div>
              <button
                onClick={handleSaveRegister}
                disabled={isSaving || filteredStudents.length === 0}
                className="w-full sm:w-auto attendx-btn-primary px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl shadow-md"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-attendx-cyan" />
                )}
                Save Digital Register ({currentPresentCount} Present)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATE-WISE ATTENDANCE EDIT & AUDIT OVERRIDE */}
      {/* ========================================================================= */}
      {activeTab === 'DATE_EDIT' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-attendx-navy text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CalendarIcon className="w-5 h-5 text-attendx-blue shrink-0" />
              <div>
                <span className="font-bold">Date-Wise Record Editor</span>: You are inspecting attendance for{' '}
                <strong>{selectedDate}</strong>. Changes made here will instantly update the student's academic record
                and generate an immutable audit log entry.
              </div>
            </div>
            {rosterData?.session_status && (
              <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-white border border-blue-200 text-attendx-blue">
                Session: {rosterData.session_status}
              </span>
            )}
          </div>

          {/* Records Table with Edit Button */}
          <div className="attendx-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-attendx-navy">
                Attendance Log for {selectedClass?.subject_name} ({selectedDate})
              </h3>
              <span className="text-xs text-attendx-muted">
                {rosterData?.summary.present_count || 0} Present / {rosterData?.summary.total_students || 0} Total
              </span>
            </div>

            {isLoadingRoster ? (
              <div className="p-12 text-center text-attendx-muted">
                <div className="w-8 h-8 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading records...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Reg No</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Marked Via</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Correct / Edit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => {
                      const isPresent = student.status === 'PRESENT';
                      const isUnmarked = student.status === 'UNMARKED';

                      return (
                        <tr key={student.student_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-attendx-navy">
                            {student.full_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {student.registration_number}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                                isPresent
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isUnmarked
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {isPresent ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : isUnmarked ? (
                                <Clock className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              {student.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {student.verification_method || 'UNRECORDED'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {student.marked_at || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isPresent ? (
                              <button
                                onClick={() => handleOpenSingleEdit(student, 'ABSENT')}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-50 text-attendx-danger hover:bg-red-100 border border-red-200 transition-colors"
                              >
                                Change to Absent
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenSingleEdit(student, 'PRESENT')}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              >
                                Change to Present
                              </button>
                            )}
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

      {/* ========================================================================= */}
      {/* TAB 3: AUDIT HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-6">
          <div className="attendx-card p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-attendx-navy flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-attendx-blue" />
                  Attendance Modification Audit Trail
                </h3>
                <p className="text-xs text-attendx-muted mt-0.5">
                  Immutable record of all manual register submissions and individual attendance edits.
                </p>
              </div>
              <button
                onClick={loadAuditHistory}
                className="attendx-btn-secondary px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Refresh Log
              </button>
            </div>

            {isLoadingAudit ? (
              <div className="p-12 text-center text-attendx-muted">
                <div className="w-8 h-8 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading audit trail...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-attendx-muted space-y-2">
                <History className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">No attendance modifications recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Modification</th>
                      <th className="py-3 px-4">Modified By</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-50 text-attendx-blue border border-blue-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-attendx-navy">
                          {log.student_name !== '-' ? (
                            <>
                              <div>{log.student_name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{log.registration_number}</div>
                            </>
                          ) : (
                            <span className="text-slate-400">Class Register</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {log.subject_name}
                        </td>
                        <td className="py-3 px-4">
                          {log.old_status !== '-' ? (
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <span className="text-slate-500 line-through">{log.old_status}</span>
                              <span className="text-slate-400">→</span>
                              <span className="font-bold text-attendx-blue">{log.new_status}</span>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-[11px]">Bulk Register</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{log.changed_by}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{log.role}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic">
                          "{log.reason}"
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

      {/* ========================================================================= */}
      {/* SINGLE STUDENT EDIT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-attendx-blue flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-attendx-navy">Modify Attendance Record</h3>
                  <p className="text-xs text-attendx-muted">For {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-attendx-muted">Student:</span>
                <span className="font-bold text-attendx-navy">{editingStudent.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-attendx-muted">Subject:</span>
                <span className="font-semibold text-slate-700">{selectedClass?.subject_name}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-attendx-muted">Current Status:</span>
                <span className="font-bold text-slate-600">{editingStudent.current_status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-attendx-muted">New Status:</span>
                <span
                  className={`font-extrabold px-2 py-0.5 rounded text-[11px] ${
                    editingStudent.target_status === 'PRESENT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {editingStudent.target_status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-attendx-navy mb-1.5">
                Reason / Justification for Modification <span className="text-attendx-danger">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Student was present in lecture, verified manually..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-attendx-blue"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="flex-1 attendx-btn-secondary py-2.5 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleEdit}
                disabled={isSubmittingEdit || !editReason.trim()}
                className="flex-1 attendx-btn-primary py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                {isSubmittingEdit ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
