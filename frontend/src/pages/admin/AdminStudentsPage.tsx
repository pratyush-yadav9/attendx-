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
  Send,
  Camera,
  Upload,
  User,
  Edit3,
  UserCheck,
  Image as ImageIcon
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
  const [createPhotoBase64, setCreatePhotoBase64] = useState<string | null>(null);
  const [createPhotoPreview, setCreatePhotoPreview] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Student Profile & Photo Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [studentToEdit, setStudentToEdit] = useState<AdminStudentItem | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    registration_number: '',
    roll_number: '',
    department_id: '',
    semester_id: '',
    section_id: '',
    is_active: true
  });
  const [editPhotoBase64, setEditPhotoBase64] = useState<string | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

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

  const handlePhotoFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setBase64: (val: string | null) => void,
    setPreview: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBase64(result);
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      await adminService.createStudent({
        ...createForm,
        photo_base64: createPhotoBase64 || undefined
      });
      setIsCreateModalOpen(false);
      setCreatePhotoBase64(null);
      setCreatePhotoPreview(null);
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

  const handleOpenEditModal = (stu: AdminStudentItem) => {
    setStudentToEdit(stu);
    setEditForm({
      full_name: stu.full_name,
      email: stu.email,
      registration_number: stu.registration_number,
      roll_number: stu.roll_number,
      department_id: stu.department_id,
      semester_id: stu.semester_id,
      section_id: stu.section_id,
      is_active: stu.is_active
    });
    setEditPhotoBase64(null);
    setEditPhotoPreview(null);
    setEditError(null);
    setEditSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;

    setIsSubmittingEdit(true);
    setEditError(null);
    setEditSuccessMsg(null);

    try {
      await adminService.updateStudent(studentToEdit.id, {
        ...editForm,
        photo_base64: editPhotoBase64 || undefined
      });

      setEditSuccessMsg('Student profile & biometric portrait successfully updated!');
      const updated = await adminService.getStudents();
      setStudents(updated);

      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update student profile.');
    } finally {
      setIsSubmittingEdit(false);
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
                        <div className="flex items-center gap-3">
                          {/* Biometric Face Photo Thumbnail */}
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                              {st.photo_url ? (
                                <img
                                  src={st.photo_url}
                                  alt={st.full_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <User className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            {st.photo_url ? (
                              <span
                                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                                title="Biometric Face Photo Enrolled"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5" />
                              </span>
                            ) : (
                              <span
                                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-white"
                                title="No Biometric Photo Enrolled"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-attendx-navy truncate">{st.full_name}</p>
                            <p className="text-[10px] text-attendx-muted truncate">{st.email}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                              <span className="text-[9px] text-slate-400 uppercase font-semibold">
                                {st.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(st)}
                            className="attendx-btn-secondary text-xs px-2.5 py-1 font-bold inline-flex items-center gap-1 hover:border-attendx-blue hover:text-attendx-blue"
                            title="View and Edit Profile & Biometrics"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-attendx-blue" />
                            Edit Profile
                          </button>
                          <button
                            onClick={() => handleOpenPromote(st)}
                            className="attendx-btn-secondary text-xs px-2.5 py-1 font-bold inline-flex items-center gap-1 hover:border-purple-600 hover:text-purple-600"
                          >
                            <Award className="w-3.5 h-3.5 text-purple-600" />
                            Promote
                          </button>
                        </div>
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

              {/* Biometric Reference Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-attendx-blue" />
                    Biometric Face Photo (For Attendance Verification)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Enrolls reference portrait</span>
                </label>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70">
                  {createPhotoPreview ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-attendx-blue shrink-0 shadow-sm">
                      <img src={createPhotoPreview} alt="Student Face Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setCreatePhotoBase64(null);
                          setCreatePhotoPreview(null);
                        }}
                        className="absolute top-0 right-0 p-1 bg-red-600 hover:bg-red-700 text-white rounded-bl-lg transition-colors"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0 shadow-xs">
                      <User className="w-6 h-6 text-slate-300" />
                      <span className="text-[9px] mt-0.5 text-slate-400">No Photo</span>
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      type="file"
                      id="create-student-photo"
                      accept="image/*"
                      onChange={(e) => handlePhotoFileChange(e, setCreatePhotoBase64, setCreatePhotoPreview)}
                      className="hidden"
                    />
                    <label
                      htmlFor="create-student-photo"
                      className="attendx-btn-secondary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 cursor-pointer font-bold shadow-xs hover:border-attendx-blue hover:text-attendx-blue"
                    >
                      <Upload className="w-3.5 h-3.5 text-attendx-blue" />
                      {createPhotoPreview ? 'Change Photo' : 'Upload Student Photo'}
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Upload an official clear portrait (JPG, PNG). This image is enrolled into the AI facial recognition database for student attendance check-ins.
                    </p>
                  </div>
                </div>
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

      {/* EDIT STUDENT PROFILE & BIOMETRICS MODAL */}
      {isEditModalOpen && studentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-attendx-blue flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-attendx-navy">
                    Edit Student Profile & Biometrics
                  </h3>
                  <p className="text-xs text-attendx-muted">
                    Manage student identity credentials, academic allocation, and facial recognition photo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Student Quick Info Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-attendx-navy block">{studentToEdit.full_name}</span>
                <span className="text-[11px] text-slate-500">
                  {studentToEdit.department_name} • Semester {studentToEdit.semester_number} (Section {studentToEdit.section_name})
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-attendx-blue block">{studentToEdit.registration_number}</span>
                <span className="text-[10px] text-slate-400">Attendance: {studentToEdit.attendance_percentage}%</span>
              </div>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-4">
              {/* Biometric Face Verification Photo Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-attendx-navy flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-attendx-blue" />
                    Official Biometric Face Photo (For Attendance Verification)
                  </label>
                  {studentToEdit.photo_url ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Enrolled
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Missing
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Display: Preview new photo or current registered photo */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-28 rounded-2xl overflow-hidden bg-slate-200 border-2 border-attendx-border shadow-xs flex items-center justify-center">
                      {editPhotoPreview ? (
                        <img
                          src={editPhotoPreview}
                          alt="New Photo Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : studentToEdit.photo_url ? (
                        <img
                          src={studentToEdit.photo_url}
                          alt={studentToEdit.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <User className="w-8 h-8 text-slate-300 mb-1" />
                          <span className="text-[9px] font-semibold">No Photo</span>
                        </div>
                      )}
                    </div>

                    {editPhotoPreview && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-attendx-blue text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                        New
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {editPhotoPreview ? (
                        <strong className="text-attendx-blue">New photo selected.</strong>
                      ) : studentToEdit.photo_url ? (
                        <span>Current enrolled portrait. This is verified against when the student scans attendance.</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">No face registered yet. Upload a photo below to enable facial verification.</span>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <input
                        type="file"
                        id="edit-student-photo"
                        accept="image/*"
                        onChange={(e) => handlePhotoFileChange(e, setEditPhotoBase64, setEditPhotoPreview)}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-student-photo"
                        className="attendx-btn-secondary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 cursor-pointer font-bold shadow-xs hover:border-attendx-blue hover:text-attendx-blue"
                      >
                        <Upload className="w-3.5 h-3.5 text-attendx-blue" />
                        {editPhotoPreview || studentToEdit.photo_url ? 'Upload New Photo' : 'Upload Student Photo'}
                      </label>

                      {editPhotoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditPhotoBase64(null);
                            setEditPhotoPreview(null);
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1"
                        >
                          Cancel Photo Change
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Full Legal Name <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
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
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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
                    value={editForm.registration_number}
                    onChange={(e) => setEditForm({ ...editForm, registration_number: e.target.value })}
                    className="attendx-input text-xs w-full uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Roll Number <span className="text-attendx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.roll_number}
                    onChange={(e) => setEditForm({ ...editForm, roll_number: e.target.value })}
                    className="attendx-input text-xs w-full font-mono"
                  />
                </div>
              </div>

              {/* Academic Allocations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-attendx-navy mb-1">
                    Department
                  </label>
                  <select
                    value={editForm.department_id}
                    onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
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
                    value={editForm.semester_id}
                    onChange={(e) => setEditForm({ ...editForm, semester_id: e.target.value })}
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
                    value={editForm.section_id}
                    onChange={(e) => setEditForm({ ...editForm, section_id: e.target.value })}
                    className="attendx-input text-xs w-full"
                    required
                  >
                    {academic?.sections.map(sec => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Status Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-attendx-blue rounded border-slate-300 focus:ring-attendx-blue"
                />
                <label htmlFor="edit-is-active" className="text-xs font-bold text-attendx-navy cursor-pointer">
                  Student Account Active (Uncheck to temporarily suspend attendance permissions)
                </label>
              </div>

              {editSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 text-attendx-success border border-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              {editError && (
                <div className="p-3 rounded-xl bg-red-50 text-attendx-danger border border-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="attendx-btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="attendx-btn-primary text-xs px-5 py-2.5 flex items-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
