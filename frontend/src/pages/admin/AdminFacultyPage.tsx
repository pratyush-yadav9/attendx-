import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  Mail,
  Phone,
  X
} from 'lucide-react';
import { adminService, AdminTeacherItem, AcademicOverview } from '../../services/adminService';
import { api } from '../../services/api';

export const AdminFacultyPage: React.FC = () => {
  const [teachers, setTeachers] = useState<AdminTeacherItem[]>([]);
  const [academic, setAcademic] = useState<AcademicOverview | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');

  // Create Faculty Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    employee_id: '',
    department_id: '',
    designation: 'Assistant Professor',
    email: '',
    password: 'Password@123',
    phone: '+91 98765 43210'
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Assign Subject Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assignForm, setAssignForm] = useState({
    teacher_id: '',
    subject_id: '',
    section_id: '',
    semester_id: ''
  });
  const [isSubmittingAssign, setIsSubmittingAssign] = useState<boolean>(false);
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tchRes, acadRes, assignRes] = await Promise.all([
        adminService.getTeachers(),
        adminService.getAcademicOverview(),
        api.get<any[]>('/admin/teacher-assignments')
      ]);
      setTeachers(tchRes);
      setAcademic(acadRes);
      setAssignments(assignRes || []);

      if (acadRes.departments.length > 0) {
        setCreateForm(prev => ({
          ...prev,
          department_id: acadRes.departments[0].id
        }));
      }

      if (tchRes.length > 0 && acadRes.subjects.length > 0) {
        setAssignForm({
          teacher_id: tchRes[0].id,
          subject_id: acadRes.subjects[0].id,
          section_id: acadRes.sections[0]?.id || '',
          semester_id: acadRes.semesters[0]?.id || ''
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load faculty roster.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      await adminService.createTeacher(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({
        full_name: '',
        employee_id: '',
        department_id: academic?.departments[0]?.id || '',
        designation: 'Assistant Professor',
        email: '',
        password: 'Password@123',
        phone: '+91 98765 43210'
      });
      const updated = await adminService.getTeachers();
      setTeachers(updated);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to register faculty.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAssign(true);
    setAssignFeedback(null);

    try {
      await api.post('/admin/teacher-assignments', assignForm);
      setAssignFeedback({ type: 'success', message: 'Subject allocated to instructor successfully!' });
      const updatedAssign = await api.get<any[]>('/admin/teacher-assignments');
      setAssignments(updatedAssign || []);
      setTimeout(() => {
        setIsAssignModalOpen(false);
        setAssignFeedback(null);
      }, 1500);
    } catch (err: any) {
      setAssignFeedback({ type: 'error', message: err.message || 'Failed to assign subject.' });
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    if (selectedDeptId !== 'ALL' && t.department_id !== selectedDeptId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.full_name.toLowerCase().includes(q);
      const matchEmp = t.employee_id.toLowerCase().includes(q);
      if (!matchName && !matchEmp) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Loading faculty registry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load faculty</h2>
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
            Faculty Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Faculty Registry & Subject Allocation
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Department instructors, credentials, teaching load, and classroom authorizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="attendx-btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl"
          >
            <BookOpen className="w-4 h-4 text-attendx-blue" />
            Allocate Subject
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="attendx-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 text-attendx-cyan" />
            Register Faculty
          </button>
          <Link
            to="/admin/dashboard"
            className="attendx-btn-secondary px-4 py-2.5 text-xs font-bold rounded-xl"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="attendx-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search faculty by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="attendx-input pl-9 text-xs py-1.5 w-full"
            />
          </div>

          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="attendx-input text-xs py-1.5 px-3 min-w-[140px]"
          >
            <option value="ALL">All Departments</option>
            {academic?.departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-attendx-muted font-medium">
          Showing {filteredTeachers.length} faculty members
        </span>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map((t) => {
          const facultyAssignments = assignments.filter(a => a.teacher_id === t.id);

          return (
            <div key={t.id} className="attendx-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-attendx-success font-black text-base flex items-center justify-center">
                    {t.full_name.charAt(0)}
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {t.employee_id}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-attendx-navy">
                  {t.full_name}
                </h3>
                <p className="text-xs font-semibold text-attendx-blue mt-0.5">
                  {t.designation} • {t.department_name}
                </p>

                <div className="mt-3 space-y-1 text-xs text-attendx-muted">
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.email}</span>
                  </p>
                  {t.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.phone}</span>
                    </p>
                  )}
                </div>

                {/* Assigned Teaching Load */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
                    Allocated Courses ({facultyAssignments.length})
                  </span>
                  {facultyAssignments.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {facultyAssignments.map(a => (
                        <span key={a.id} className="text-[10px] font-mono font-bold bg-blue-50 text-attendx-blue border border-blue-200 px-2 py-0.5 rounded">
                          {a.subject_code} (Sec {a.section_name})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No courses allocated yet</span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-attendx-success font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Faculty
                </span>
                <button
                  onClick={() => {
                    setAssignForm(prev => ({ ...prev, teacher_id: t.id }));
                    setIsAssignModalOpen(true);
                  }}
                  className="font-bold text-attendx-blue hover:underline"
                >
                  + Add Course
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* REGISTER FACULTY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5">
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div>
                <h3 className="text-base font-bold text-attendx-navy">
                  Register Faculty Member
                </h3>
                <p className="text-xs text-attendx-muted">
                  Create instructor credentials and assign department.
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Full Name <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Amit Sharma"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    className="attendx-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Employee ID <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-CSE-003"
                    value={createForm.employee_id}
                    onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                    className="attendx-input text-xs w-full uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    Designation
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.designation}
                    onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                    className="attendx-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Email Address <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="prof@college.edu"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="attendx-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="attendx-input text-xs w-full"
                  />
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
                  Register Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE SUBJECT MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5">
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div>
                <h3 className="text-base font-bold text-attendx-navy">
                  Allocate Subject to Instructor
                </h3>
                <p className="text-xs text-attendx-muted">
                  Assign teaching responsibility for course section.
                </p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1">
                  Faculty Instructor
                </label>
                <select
                  value={assignForm.teacher_id}
                  onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })}
                  className="attendx-input text-xs w-full"
                  required
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.employee_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1">
                  Subject Course
                </label>
                <select
                  value={assignForm.subject_id}
                  onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })}
                  className="attendx-input text-xs w-full"
                  required
                >
                  {academic?.subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Semester
                  </label>
                  <select
                    value={assignForm.semester_id}
                    onChange={(e) => setAssignForm({ ...assignForm, semester_id: e.target.value })}
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
                    value={assignForm.section_id}
                    onChange={(e) => setAssignForm({ ...assignForm, section_id: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {academic?.sections.map(sec => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {assignFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  assignFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-attendx-success border border-emerald-200' 
                    : 'bg-red-50 text-attendx-danger border border-red-200'
                }`}>
                  {assignFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{assignFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="attendx-btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="attendx-btn-primary text-xs px-5 py-2 flex items-center gap-2"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
