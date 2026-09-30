import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Filter, 
  FileText, 
  QrCode, 
  AlertTriangle, 
  Users, 
  MapPin, 
  Wifi, 
  Image as ImageIcon,
  ChevronRight,
  X
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';
import { TeacherSessionItem, SessionDetailedReport, StudentSessionReport } from '../../types';

export const TeacherSessionsPage: React.FC = () => {
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();

  const [sessions, setSessions] = useState<TeacherSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');

  // Detailed Report Modal state
  const [activeReportSessionId, setActiveReportSessionId] = useState<string | null>(routeSessionId || null);
  const [reportData, setReportData] = useState<SessionDetailedReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeReportSessionId) {
      loadDetailedReport(activeReportSessionId);
    }
  }, [activeReportSessionId]);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await teacherService.getSessions();
      setSessions(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load class sessions.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetailedReport = async (sId: string) => {
    setIsLoadingReport(true);
    try {
      const res = await teacherService.getSessionReport(sId);
      setReportData(res);
    } catch (err: any) {
      alert(err.message || 'Failed to load session report.');
      setActiveReportSessionId(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const { session, students } = reportData;

    const headers = ['Roll No', 'Registration No', 'Student Name', 'Status', 'Marked At', 'Geofence Distance (m)', 'Wi-Fi Verified'];
    const rows = students.map(s => [
      `"${s.roll_number}"`,
      `"${s.registration_number}"`,
      `"${s.student_name}"`,
      `"${s.status}"`,
      `"${s.marked_at || 'N/A'}"`,
      `"${s.distance_meters !== undefined && s.distance_meters !== null ? s.distance_meters : 'N/A'}"`,
      `"${s.is_wifi_verified ? 'Yes' : 'No'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${session.subject_code}_${session.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueSubjects = Array.from(new Set(sessions.map(s => s.subject_code)));

  const filteredSessions = sessions.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (subjectFilter !== 'ALL' && s.subject_code !== subjectFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Loading lecture archives and reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load sessions</h2>
          <p className="text-xs text-attendx-muted">{error}</p>
          <button onClick={loadSessions} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
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
            Teaching Records
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Class Sessions & Attendance Reports
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Historical attendance logs, section-wide rosters, and regulatory CSV exports.
          </p>
        </div>

        <Link
          to="/teacher/dashboard"
          className="attendx-btn-secondary px-4 py-2 text-xs font-bold self-start sm:self-auto"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="attendx-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-attendx-muted" />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="attendx-input text-xs py-1.5 px-3 min-w-[140px]"
            >
              <option value="ALL">All Subjects</option>
              {uniqueSubjects.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="attendx-input text-xs py-1.5 px-3"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Live)</option>
            <option value="CLOSED">Closed (Finalized)</option>
          </select>

          {(subjectFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSubjectFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs text-attendx-danger font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        <span className="text-xs text-attendx-muted font-medium">
          Showing {filteredSessions.length} of {sessions.length} sessions
        </span>
      </div>

      {/* Sessions Table */}
      <div className="attendx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-attendx-border text-attendx-muted uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Subject & Section</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Attendees</th>
                <th className="py-3 px-4">Turnout Ratio</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((s) => {
                  const isActive = s.status === 'ACTIVE';
                  const pct = s.total_enrolled > 0 
                    ? ((s.present_count / s.total_enrolled) * 100).toFixed(1) 
                    : '0.0';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-attendx-navy">{s.subject_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                            {s.subject_code}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Sec {s.section_name} • Sem {s.semester_number}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-attendx-text">{s.date}</p>
                        <span className="text-[10px] font-mono text-attendx-muted">
                          {s.start_time} {s.end_time ? `- ${s.end_time}` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                        {s.room_number || 'LH-101'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isActive 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-attendx-navy text-sm">
                          {s.present_count}
                        </span>
                        <span className="text-slate-400 text-[10px]"> / {s.total_enrolled} enrolled</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-attendx-navy">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                Number(pct) >= 75 ? 'bg-attendx-success' : 'bg-attendx-warning'
                              }`}
                              style={{ width: `${Math.min(Number(pct), 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isActive && (
                            <Link
                              to={`/teacher/session/${s.id}`}
                              className="attendx-btn-primary text-xs px-2.5 py-1 flex items-center gap-1"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              Live Broadcaster
                            </Link>
                          )}
                          <button
                            onClick={() => setActiveReportSessionId(s.id)}
                            className="text-xs text-attendx-blue hover:text-blue-800 font-bold hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Report
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-attendx-muted">
                    No class sessions found matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED ATTENDANCE REPORT MODAL */}
      {activeReportSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-attendx-border overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-attendx-border flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
                    Official Session Attendance Audit
                  </span>
                  {reportData?.session.status === 'ACTIVE' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      LIVE IN PROGRESS
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-attendx-navy mt-1">
                  {reportData?.session.subject_name || 'Loading report...'}
                </h3>
                {reportData && (
                  <p className="text-xs text-attendx-muted mt-0.5">
                    {reportData.session.subject_code} • Section {reportData.session.section_name} • Date: {reportData.session.date} • Room {reportData.session.room_number}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {reportData && (
                  <button
                    onClick={handleExportCSV}
                    className="attendx-btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveReportSessionId(null);
                    setReportData(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Stats & Student Roster */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingReport ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-attendx-muted">Compiling attendance logs and verification metrics...</p>
                </div>
              ) : reportData ? (
                <>
                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-attendx-muted uppercase block">Total Enrolled</span>
                      <span className="text-xl font-black text-attendx-navy">{reportData.session.total_enrolled}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-attendx-muted uppercase block">Present Count</span>
                      <span className="text-xl font-black text-attendx-success">{reportData.session.present_count}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-attendx-muted uppercase block">Absent Count</span>
                      <span className="text-xl font-black text-attendx-danger">
                        {reportData.session.total_enrolled - reportData.session.present_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-attendx-muted uppercase block">Turnout Ratio</span>
                      <span className="text-xl font-black text-attendx-blue">{reportData.session.attendance_percentage}%</span>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-4">Roll No</th>
                          <th className="py-2.5 px-4">Registration No</th>
                          <th className="py-2.5 px-4">Student Name</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Marked At</th>
                          <th className="py-2.5 px-4">Anti-Proxy Verifications</th>
                          <th className="py-2.5 px-4 text-right">Selfie</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.students.map((st) => (
                          <tr key={st.student_id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{st.roll_number}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-500">{st.registration_number}</td>
                            <td className="py-2.5 px-4 font-bold text-attendx-navy">{st.student_name}</td>
                            <td className="py-2.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                st.status === 'PRESENT'
                                  ? 'bg-emerald-50 text-attendx-success border-emerald-200'
                                  : 'bg-red-50 text-attendx-danger border-red-200'
                              }`}>
                                {st.status === 'PRESENT' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {st.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {st.marked_at || '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              {st.status === 'PRESENT' ? (
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                                    st.is_geofence_verified 
                                      ? 'bg-blue-50 text-attendx-blue border-blue-200' 
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                    {st.distance_meters !== undefined && st.distance_meters !== null ? `${st.distance_meters}m` : 'Geofence'}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                                    st.is_wifi_verified 
                                      ? 'bg-cyan-50 text-cyan-700 border-cyan-200' 
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                    Wi-Fi
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Unrecorded</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {st.photo_url ? (
                                <button
                                  onClick={() => setPreviewPhoto(st.photo_url || null)}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  title="View captured selfie"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4 overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-slate-900/60 text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-xs font-bold text-attendx-navy mb-3 px-1">
              Biometric Attendance Snapshot
            </p>
            <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-black">
              <img
                src={previewPhoto.startsWith('http') || previewPhoto.startsWith('data:') ? previewPhoto : `http://127.0.0.1:8000${previewPhoto}`}
                alt="Verification Capture"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <p className="text-[10px] text-attendx-muted mt-2 text-center">
              Student face snapshot verified at moment of dynamic QR scan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
