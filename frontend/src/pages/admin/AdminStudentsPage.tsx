import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Plus, 
  Filter, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Award,
  Layers,
  Calendar,
  X,
  Send
} from 'lucide-react';
import { adminService, AdminStudentItem, AcademicOverview } from '../../services/adminService';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<AdminStudentItem[]>([]);
  const [academic, setAcademic] = useState<AcademicOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');

  // Create Student Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    registration_number: '',
    roll_number: '',
    email: '',
    password: 'Password@123',
    department_id: '',
    semester_id: '',
    section_id: '',
    academic_year_id: 'ay-2026-2027'
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Semester Promotion Modal
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState<boolean>(false);
  const [studentToPromote, setStudentToPromote] = useState<AdminStudentItem | null>(null);
  const [targetSemesterId, setTargetSemesterId] = useState<string>('');
  const [promotionNotes, setPromotionNotes] = useState<string>('');
  const [isSubmittingPromote, setIsSubmittingPromote] = useState<boolean>(false);
  const [promoteSuccessMsg, setPromoteSuccessMsg] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stuRes, acadRes] = await Promise.all([
        adminService.getStudents(),
        adminService.getAcademicOverview()
      ]);
      setStudents(stuRes);
      setAcademic(acadRes);

      if (acadRes.departments.length > 0) {
        setCreateForm(prev => ({
          ...prev,
          department_id: acadRes.departments[0].id,
          semester_id: acadRes.semesters[0]?.id || '',
          section_id: acadRes.sections[0]?.id || ''
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load student roster.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      await adminService.createStudent(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({
        full_name: '',
        registration_number: '',
        roll_number: '',
        email: '',
        password: 'Password@123',
        department_id: academic?.departments[0]?.id || '',
        semester_id: academic?.semesters[0]?.id || '',
        section_id: academic?.sections[0]?.id || '',
        academic_year_id: 'ay-2026-2027'
      });
      // Refresh list
      const updated = await adminService.getStudents();
      setStudents(updated);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to register student.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenPromote = (stu: AdminStudentItem) => {
    setStudentToPromote(stu);
    setPromotionNotes('');
    setPromoteError(null);
    setPromoteSuccessMsg(null);

    // Default next semester
    const nextSem = academic?.semesters.find(s => s.semester_number === stu.semester_number + 1);
    setTargetSemesterId(nextSem?.id || '');
    setIsPromoteModalOpen(true);
  };

  const handlePromoteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToPromote || !targetSemesterId) return;

    setIsSubmittingPromote(true);
    setPromoteError(null);
    setPromoteSuccessMsg(null);

    try {
      const res = await adminService.promoteStudent({
        student_id: studentToPromote.id,
        to_semester_id: targetSemesterId,
        notes: promotionNotes.trim() || 'Promoted by HOD Admin'
      });

      setPromoteSuccessMsg(
        `Successfully promoted to next semester! Historical attendance (${res.final_attendance_percentage}%) has been frozen permanently in regulatory archives.`
      );

      // Refresh list
      const updated = await adminService.getStudents();
      setStudents(updated);

      setTimeout(() => {
        setIsPromoteModalOpen(false);
        setPromoteSuccessMsg(null);
      }, 2200);
    } catch (err: any) {
      setPromoteError(err.message || 'Failed to promote student.');
    } finally {
      setIsSubmittingPromote(false);
    }
  };

  const filteredStudents = students.filter(s => {
    if (selectedDeptId !== 'ALL' && s.department_id !== selectedDeptId) return false;
    if (selectedSemesterId !== 'ALL' && s.semester_id !== selectedSemesterId) return false;
    if (selectedSectionId !== 'ALL' && s.section_id !== selectedSectionId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.full_name.toLowerCase().includes(q);
      const matchReg = s.registration_number.toLowerCase().includes(q);
      const matchRoll = s.roll_number.toLowerCase().includes(q);
      if (!matchName && !matchReg && !matchRoll) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Loading department student directory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load students</h2>
          <p className="text-xs text-attendx-muted">{error}</p>
          <button onClick={loadAllData} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
            Student Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Student Directory & Semester Promotion
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Real-time computed attendance ratios, enrollment management, and permanent semester promotion engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="attendx-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 text-attendx-cyan" />
            Register Student
          </button>
          <Link
            to="/admin/dashboard"
            className="attendx-btn-secondary px-4 py-2.5 text-xs font-bold rounded-xl"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="attendx-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, reg no, roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="attendx-input pl-9 text-xs py-1.5 w-full"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="attendx-input text-xs py-1.5 px-3 min-w-[130px]"
          >
            <option value="ALL">All Departments</option>
            {academic?.departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>

          {/* Semester Filter */}
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="attendx-input text-xs py-1.5 px-3"
          >
            <option value="ALL">All Semesters</option>
            {academic?.semesters.map(s => (
              <option key={s.id} value={s.id}>Semester {s.semester_number}</option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="attendx-input text-xs py-1.5 px-3"
          >
            <option value="ALL">All Sections</option>
            {academic?.sections.map(sec => (
              <option key={sec.id} value={sec.id}>Section {sec.name}</option>
            ))}
          </select>

          {(selectedDeptId !== 'ALL' || selectedSemesterId !== 'ALL' || selectedSectionId !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDeptId('ALL');
                setSelectedSemesterId('ALL');
                setSelectedSectionId('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-attendx-danger font-bold hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <span className="text-xs text-attendx-muted font-medium">
          Showing {filteredStudents.length} of {students.length} students
        </span>
      </div>

      {/* Students Table */}
      <div className="attendx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-attendx-border text-attendx-muted uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">Registration & Roll No</th>
                <th className="py-3 px-4">Department & Class</th>
                <th className="py-3 px-4">Attendance %</th>
                <th className="py-3 px-4">Threshold Status</th>
                <th className="py-3 px-4 text-right">Promotion & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st) => {
                  const isHealthy = st.attendance_percentage >= 75.0;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-attendx-navy">{st.full_name}</p>
                        <p className="text-[10px] text-attendx-muted truncate">{st.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-slate-800">{st.registration_number}</span>
                        <span className="text-[10px] text-slate-400 block">Roll: {st.roll_number}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-attendx-navy">{st.department_name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span>Semester {st.semester_number}</span>
                          <span>•</span>
                          <span>Section {st.section_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-base font-black ${
                            isHealthy ? 'text-attendx-success' : 'text-attendx-danger'
                          }`}>
                            {st.attendance_percentage}%
                          </span>
                        </div>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              isHealthy ? 'bg-attendx-success' : 'bg-attendx-danger'
                            }`}
                            style={{ width: `${Math.min(st.attendance_percentage, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isHealthy 
                            ? 'bg-emerald-50 text-attendx-success border-emerald-200' 
                            : 'bg-red-50 text-attendx-danger border-red-200'
                        }`}>
                          {isHealthy ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {st.attendance_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenPromote(st)}
                          className="attendx-btn-secondary text-xs px-3 py-1 font-bold inline-flex items-center gap-1 hover:border-attendx-blue hover:text-attendx-blue"
                        >
                          <Award className="w-3.5 h-3.5 text-purple-600" />
                          Promote Term
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-attendx-muted">
                    No students match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER STUDENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5">
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div>
                <h3 className="text-base font-bold text-attendx-navy">
                  Register New Student
                </h3>
                <p className="text-xs text-attendx-muted">
                  Create student profile with credentials and academic allocation.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Full Legal Name <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    className="attendx-input text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Official College Email <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="attendx-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Registration Number <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024CSE003"
                    value={createForm.registration_number}
                    onChange={(e) => setCreateForm({ ...createForm, registration_number: e.target.value })}
                    className="attendx-input text-xs w-full uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Roll Number <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24003"
                    value={createForm.roll_number}
                    onChange={(e) => setCreateForm({ ...createForm, roll_number: e.target.value })}
                    className="attendx-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Department
                  </label>
                  <select
                    value={createForm.department_id}
                    onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {academic?.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Semester
                  </label>
                  <select
                    value={createForm.semester_id}
                    onChange={(e) => setCreateForm({ ...createForm, semester_id: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {academic?.semesters.map(s => (
                      <option key={s.id} value={s.id}>Semester {s.semester_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Section
                  </label>
                  <select
                    value={createForm.section_id}
                    onChange={(e) => setCreateForm({ ...createForm, section_id: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {academic?.sections.map(sec => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1">
                  Default Temporary Password
                </label>
                <input
                  type="text"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="attendx-input text-xs w-full font-mono"
                />
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-red-50 text-attendx-danger border border-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="attendx-btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="attendx-btn-primary text-xs px-5 py-2 flex items-center gap-2"
                >
                  {isSubmittingCreate ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEMESTER PROMOTION MODAL */}
      {isPromoteModalOpen && studentToPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5">
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-attendx-navy">
                    Execute Semester Promotion
                  </h3>
                  <p className="text-xs text-attendx-muted">
                    Permanent term progression with attendance archive freezing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPromoteModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Student Info */}
            <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs space-y-1">
              <div className="flex justify-between font-bold text-attendx-navy">
                <span>{studentToPromote.full_name}</span>
                <span className="font-mono text-purple-700">{studentToPromote.registration_number}</span>
              </div>
              <div className="flex justify-between text-attendx-muted text-[11px]">
                <span>Current: <strong>Semester {studentToPromote.semester_number}</strong> (Section {studentToPromote.section_name})</span>
                <span>Final Attendance: <strong className={studentToPromote.attendance_percentage >= 75 ? 'text-attendx-success' : 'text-attendx-danger'}>
                  {studentToPromote.attendance_percentage}%
                </strong></span>
              </div>
            </div>

            <form onSubmit={handlePromoteStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1.5">
                  Target Destination Semester <span className="text-attendx-danger">*</span>
                </label>
                <select
                  value={targetSemesterId}
                  onChange={(e) => setTargetSemesterId(e.target.value)}
                  className="attendx-input text-xs w-full font-bold"
                  required
                >
                  <option value="">Select Target Semester</option>
                  {academic?.semesters
                    .filter(s => s.semester_number > studentToPromote.semester_number)
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        Semester {s.semester_number} (Next Academic Term)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1.5">
                  Promotion Notes & Justification (Permanent Record)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Promoted to Semester 4 after passing 75% attendance threshold requirements."
                  value={promotionNotes}
                  onChange={(e) => setPromotionNotes(e.target.value)}
                  className="attendx-input text-xs w-full resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
                <strong>Immutable Audit Guarantee:</strong> When you confirm this promotion, the student's Semester {studentToPromote.semester_number} attendance record ({studentToPromote.attendance_percentage}%) will be archived permanently. Their new semester counter will start fresh from 0 sessions.
              </div>

              {promoteSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 text-attendx-success border border-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{promoteSuccessMsg}</span>
                </div>
              )}

              {promoteError && (
                <div className="p-3 rounded-xl bg-red-50 text-attendx-danger border border-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{promoteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="attendx-btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPromote || !targetSemesterId}
                  className="attendx-btn-primary text-xs px-5 py-2.5 flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50"
                >
                  {isSubmittingPromote ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Award className="w-4 h-4" />
                  )}
                  Confirm Semester Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
