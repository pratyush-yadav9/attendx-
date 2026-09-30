import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  QrCode, 
  Clock, 
  MapPin, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck,
  Plus,
  ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { teacherService, StartClassPayload } from '../../services/teacherService';
import { TeacherDashboardData, TodayClass } from '../../types';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startingSlotId, setStartingSlotId] = useState<string | null>(null);

  // Custom Quick Start Modal state
  const [isQuickStartModalOpen, setIsQuickStartModalOpen] = useState<boolean>(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [customRoomNumber, setCustomRoomNumber] = useState<string>('LH-101');
  const [isStartingCustom, setIsStartingCustom] = useState<boolean>(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await teacherService.getDashboard();
      setDashboardData(res);
      if (res.assigned_subjects && res.assigned_subjects.length > 0) {
        setSelectedAssignmentId(res.assigned_subjects[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load faculty dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleStartClassFromSlot = async (cls: TodayClass) => {
    if (cls.status === 'ACTIVE' && cls.session_id) {
      navigate(`/teacher/session/${cls.session_id}`);
      return;
    }

    setStartingSlotId(cls.slot_id || cls.subject_id);
    try {
      const fallbackAssignment = dashboardData?.assigned_subjects.find(a => a.subject_id === cls.subject_id);
      const res = await teacherService.startClass({
        subject_id: cls.subject_id,
        section_id: cls.section_id || fallbackAssignment?.section_id || 'sec-001',
        semester_id: cls.semester_id || fallbackAssignment?.semester_id || 'sem-003',
        classroom_id: cls.classroom_id || 'cr-001'
      });

      // Redirect immediately to live session controller
      navigate(`/teacher/session/${res.session_id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start class session.');
    } finally {
      setStartingSlotId(null);
    }
  };

  const handleCloseAndRestart = async (cls: TodayClass) => {
    if (cls.session_id) {
      try {
        await teacherService.closeClass(cls.session_id);
      } catch (e) {
        // Continue even if close fails
      }
    }
    // Now start fresh
    handleStartClassFromSlot({ ...cls, status: 'SCHEDULED', session_id: null });
  };

  const handleStartCustomClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId || !dashboardData) return;

    const assignment = dashboardData.assigned_subjects.find(a => a.id === selectedAssignmentId);
    if (!assignment) return;

    setIsStartingCustom(true);
    try {
      const res = await teacherService.startClass({
        subject_id: assignment.subject_id,
        section_id: assignment.section_id,
        semester_id: assignment.semester_id,
        classroom_id: 'cr-001'
      });

      setIsQuickStartModalOpen(false);
      navigate(`/teacher/session/${res.session_id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start custom class.');
    } finally {
      setIsStartingCustom(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Loading faculty schedule and sessions...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load faculty dashboard</h2>
          <p className="text-xs text-attendx-muted">{error || 'Server error occurred.'}</p>
          <button onClick={loadDashboard} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { teacher, assigned_subjects, today_classes } = dashboardData;
  const activeSessionsCount = today_classes.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
            Faculty Teaching Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            {getGreeting()}, {teacher.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-attendx-success border border-emerald-200">
              {teacher.designation || 'Assistant Professor'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {teacher.department || 'Computer Science & Engineering'}
            </span>
            <span className="text-xs font-mono text-attendx-muted ml-1">
              Employee ID: {teacher.employee_id}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/teacher/attendance-management"
            className="attendx-btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl border-blue-200 text-attendx-blue hover:bg-blue-50"
          >
            <ClipboardCheck className="w-4 h-4 text-attendx-blue" />
            Attendance Register
          </Link>
          <button
            onClick={() => setIsQuickStartModalOpen(true)}
            className="attendx-btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 text-attendx-cyan" />
            Quick Start Class
          </button>
          <Link
            to="/teacher/classes"
            className="attendx-btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            Session Archives
          </Link>
        </div>
      </div>

      {/* Active Session Live Alert Banner */}
      {dashboardData?.active_session && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-attendx-navy via-blue-900 to-indigo-950 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 border border-cyan-400/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shrink-0">
              <QrCode className="w-7 h-7 text-attendx-cyan animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Session Active Now
                </span>
                <span className="text-xs text-blue-200 font-medium">Room {dashboardData.active_session.room_number || 'Main Hall'}</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {dashboardData.active_session.subject_name} ({dashboardData.active_session.subject_code})
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Section {dashboardData.active_session.section_name} • {dashboardData.active_session.total_marked} students verified present
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/teacher/session/${dashboardData.active_session?.session_id}`)}
            className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-slate-950 font-bold text-xs shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2.5 shrink-0 relative z-10"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume Live Session & View Dynamic QR</span>
          </button>
        </div>
      )}

      {/* Quick Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="attendx-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-attendx-blue flex items-center justify-center font-bold text-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Today's Scheduled Slots
            </span>
            <span className="text-2xl font-black text-attendx-navy">
              {today_classes.length}
            </span>
            <span className="text-[10px] text-attendx-muted block mt-0.5">
              From department timetable
            </span>
          </div>
        </div>

        <div className="attendx-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-attendx-success flex items-center justify-center font-bold text-lg">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Active Dynamic Sessions
            </span>
            <span className="text-2xl font-black text-attendx-navy">
              {activeSessionsCount}
            </span>
            <span className="text-[10px] text-attendx-muted block mt-0.5">
              Live Rotating QR Active
            </span>
          </div>
        </div>

        <div className="attendx-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Assigned Subjects
            </span>
            <span className="text-2xl font-black text-attendx-navy">
              {assigned_subjects.length}
            </span>
            <span className="text-[10px] text-attendx-muted block mt-0.5">
              Across department sections
            </span>
          </div>
        </div>
      </div>

      {/* TODAY'S SCHEDULE & CLASS LAUNCHER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-attendx-navy flex items-center gap-2">
              <Clock className="w-5 h-5 text-attendx-blue" />
              Today's Classes & Live Launcher
            </h2>
            <p className="text-xs text-attendx-muted">
              Start class session, project dynamic 45-second rotating QR codes, and monitor anti-proxy verified scans in real time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {today_classes.length > 0 ? (
            today_classes.map((cls, idx) => {
              const isActive = cls.status === 'ACTIVE';
              const isClosed = cls.status === 'CLOSED';
              const isScheduled = cls.status === 'SCHEDULED' || !cls.status;
              const isStartingThis = startingSlotId === (cls.slot_id || cls.subject_id);

              return (
                <div
                  key={cls.slot_id || idx}
                  className={`attendx-card p-6 flex flex-col justify-between transition-all relative overflow-hidden ${
                    isActive 
                      ? 'border-2 border-emerald-400 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-md' 
                      : 'hover:shadow-md'
                  }`}
                >
                  {/* Top status accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isActive ? 'bg-emerald-500 animate-pulse' : isClosed ? 'bg-slate-300' : 'bg-attendx-blue'
                  }`} />

                  <div>
                    {/* Top Row: Section, Code, Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                          {cls.subject_code}
                        </span>
                        <span className="text-[10px] font-bold bg-blue-50 text-attendx-blue px-2 py-0.5 rounded">
                          Sec {cls.section_name || 'A'}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isActive 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1' 
                          : isClosed 
                          ? 'bg-slate-100 text-slate-600 border-slate-200' 
                          : 'bg-blue-50 text-attendx-blue border-blue-200'
                      }`}>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                        {cls.status || 'SCHEDULED'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-attendx-navy line-clamp-1">
                      {cls.subject_name}
                    </h3>

                    {/* Metadata: Time & Room */}
                    <div className="mt-4 space-y-1.5 text-xs text-attendx-muted">
                      <p className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-attendx-blue" />
                        <span className="font-mono font-semibold text-slate-700">{cls.start_time} - {cls.end_time}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-attendx-blue" />
                        <span>Room {cls.room_number || 'LH-101'}</span>
                      </p>
                      {cls.present_count !== undefined && cls.present_count > 0 && (
                        <p className="flex items-center gap-2 font-semibold text-attendx-navy pt-1">
                          <Users className="w-3.5 h-3.5 text-attendx-success" />
                          <span>{cls.present_count} students marked present</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {isActive ? (
                      <div className="space-y-2">
                        <Link
                          to={`/teacher/session/${cls.session_id}`}
                          className="w-full attendx-btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                        >
                          <QrCode className="w-4 h-4 text-emerald-200" />
                          Resume Live QR Session
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCloseAndRestart(cls)}
                          className="w-full text-center text-[11px] text-slate-500 hover:text-attendx-danger font-medium transition-colors py-0.5"
                        >
                          End session & start fresh
                        </button>
                      </div>
                    ) : isClosed ? (
                      <Link
                        to={cls.session_id ? `/teacher/sessions/${cls.session_id}/report` : '/teacher/classes'}
                        className="w-full attendx-btn-secondary py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl"
                      >
                        <FileCheck className="w-4 h-4 text-slate-500" />
                        View Attendance Report
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleStartClassFromSlot(cls)}
                        disabled={isStartingThis}
                        className="w-full attendx-btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl"
                      >
                        {isStartingThis ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 text-attendx-cyan fill-current" />
                        )}
                        START CLASS & GENERATE QR
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 attendx-card p-12 text-center text-attendx-muted space-y-3">
              <Clock className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-attendx-navy">No scheduled classes on the timetable for today</h4>
              <p className="text-xs text-slate-400">
                You can still initiate an unscheduled lecture session for any of your assigned subjects below.
              </p>
              <button
                onClick={() => setIsQuickStartModalOpen(true)}
                className="attendx-btn-primary text-xs px-4 py-2 mt-2 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Quick Start Class
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ASSIGNED SUBJECTS & SECTIONS */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-attendx-navy flex items-center gap-2">
            <Layers className="w-5 h-5 text-attendx-blue" />
            Assigned Subjects & Teaching Load
          </h2>
          <p className="text-xs text-attendx-muted">
            Official department teaching assignments for the current academic term.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assigned_subjects.map((sub) => (
            <div key={sub.id} className="attendx-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-attendx-blue px-2.5 py-1 rounded border border-blue-200">
                  {sub.subject_code}
                </span>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  Semester {sub.semester_number}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-attendx-navy">
                  {sub.subject_name}
                </h4>
                <p className="text-xs text-attendx-muted mt-1">
                  Assigned to <strong>Section {sub.section_name}</strong>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedAssignmentId(sub.id);
                    setIsQuickStartModalOpen(true);
                  }}
                  className="text-xs font-bold text-attendx-blue hover:underline flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" /> Start Class Session
                </button>
                <Link
                  to="/teacher/classes"
                  className="text-[11px] text-slate-500 hover:text-attendx-navy font-medium"
                >
                  Logs <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK START CLASS MODAL */}
      {isQuickStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-attendx-border space-y-5">
            <div className="flex items-center justify-between border-b border-attendx-border pb-4">
              <div>
                <h3 className="text-base font-bold text-attendx-navy">
                  Start Live Class Session
                </h3>
                <p className="text-xs text-attendx-muted">
                  Generates an active attendance session and dynamic QR code.
                </p>
              </div>
              <button
                onClick={() => setIsQuickStartModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartCustomClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1.5">
                  Select Assigned Subject & Section
                </label>
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="attendx-input text-xs w-full"
                  required
                >
                  {assigned_subjects.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.subject_code} - {a.subject_name} (Sec {a.section_name}, Sem {a.semester_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1.5">
                  Designated Lecture Hall / Room Number
                </label>
                <input
                  type="text"
                  value={customRoomNumber}
                  onChange={(e) => setCustomRoomNumber(e.target.value)}
                  placeholder="e.g. LH-101 or CSE Lab 2"
                  className="attendx-input text-xs w-full"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-[11px] text-attendx-navy space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-attendx-blue">
                  <Sparkles className="w-3.5 h-3.5" /> Anti-Proxy Guard Active
                </p>
                <p className="text-attendx-muted leading-relaxed">
                  Dynamic QR codes will automatically expire and rotate every 45 seconds. Geofencing and face verification are required for student check-ins.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickStartModalOpen(false)}
                  className="attendx-btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStartingCustom}
                  className="attendx-btn-primary text-xs px-5 py-2 flex items-center gap-2"
                >
                  {isStartingCustom ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current text-attendx-cyan" />
                  )}
                  Launch Live QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
